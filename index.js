'use strict'

const express    = require('express'),
      cors       = require('cors'),
      bodyParser = require('body-parser'),
      request    = require('request'),
      socket     = require('socket.io'),
      app        = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN

const server = app.listen(process.env.PORT || 1337, () => console.log('Webhook is listening: ' + process.env.PORT || 1337))
const io = socket(server, {
  cors: {
    origin: "https://localhost:8000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
})

io.on('connection', function(socket) {
  console.log('Made socket connection', socket.id)

  socket.on('chat', function(data) {
    console.log(data)
    callSendAPI(data.receiverID, {text: data.message})
  })
})

app.use('/webhook', bodyParser.json())
app.use('/facebook-profile', bodyParser.json())

app.post('/webhook', (req, res) => {
  const body = req.body

  if(body.object === 'page') {
    body.entry.forEach(entry =>  {
      const webhook_event = entry.messaging[0]
      console.log(webhook_event)

      const sender_psid = webhook_event.sender.id
      console.log(`Sender PSID: ${sender_psid}`)
    
      handleMessageReceived(webhook_event)
    })

    res.status(200).send('EVENT_RECEIVED')
  } else {
    res.sendStatus(404)
  }
})

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'facebook'

  const mode      = req.query['hub.mode']
  const token     = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']


  if(mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED')
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

app.get('/facebook-profile', (request, response) => {
  const psid = request.query['psid']

  if(psid) {
    handleGetProfile(psid, body => {
      if(body)
        response.status(200).send(body)

      else
        response.status(404).send("NO_PROFILE_FOUND")
    })
  } else {
    response.status(400).send('NO_PSID')
  }
})

app.use('/', express.static('public'))

function handleMessage(sender_psid, received_message) {
  let response

  if(received_message.text) {
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }

    io.sockets.emit('chat', { psid:sender_psid, message:received_message.text})
  } else if(received_message.attachments) {
    let attachment_url = received_message.attachments[0].payload.url
    response = {
      "attachment" : {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes"
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ]
          }]
        }
      }
    }
  }

  callSendAPI(sender_psid, response)
}

function handlePostback(sender_psid, received_postback) {
  let response;

  let payload = received_postback.payload

  if(payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image."}
  }

  callSendAPI(sender_psid, response)
}

function callSendAPI(sender_psid, response) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response                                    
  }

  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs" : {
      "access_token": process.env.PAGE_ACCESS_TOKEN
    },
    "method": "POST",                                                                                                                                                                                                                                                                   
    "json"  : request_body
  }, (err, res, body) => {
    if(!err) {
      console.log("Message sent!")
    } else {
      console.error("Unable to send message: " + err)
    }
  })
}

function handleGetProfile(psid, fn) {
  request({
      "uri": `https://graph.facebook.com/${psid}`,
      "qs" : {
        "access_token": process.env.PAGE_ACCESS_TOKEN,
        "fields":"first_name,last_name,profile_pic"
      },
      "method": "GET"
    }, (err, res, body) => {
    if(!err) {
      console.log("Profile retrieved:" + body)
      fn(body)
    } else {
      console.error("Unable to retrieve profile: " + err)
      fn(null)
    }
  })
}

function handleMessageReceived(webhook_event) {
  handleGetProfile(webhook_event.sender.id, body => {
    let response = {}
    if(body) {
      console.log("body:")
      console.log(body)
      response.message = webhook_event.message
      response.sender = JSON.parse(body)
      response.timestamp = webhook_event.timestamp
      response.recipient = webhook_event.timestamp

      console.log(response)

      io.sockets.emit('chat', response)
    } else {
      io.sockets.emit('chat', webhook_event)
    }
  })
}

app.use(cors({ credentials: true, origin: true}))
app.post('/facebook-send', (req, res) => {
  console.log(req.body)
})

/* VIBER */
const ViberBot  = require('viber-bot').Bot
const BotEvents = require('viber-bot').Events
const winston   = require('winston')
const toYAML    = require('winston-console-formatter')

function createLogger() {
  const logger = winston.createLogger({
    level: "debug",
    transports: [
      new winston.transports.Console()
    ]
  })

  return logger
}

const logger = createLogger();
const bot = new ViberBot({
  logger: logger,
  authToken: '4c8a94e797000e8b-73260a5339832911-4dc23e2b449f2188',
  name: 'FR Track 1 Test',
  avatar: 'http://viber.com/avatar.jpg'
})

bot.on(BotEvents.MESSAGE_RECEIVED, (message, response) => {
  console.log(message)
  response.send(message)
})

app.use('/viber/webhook', bot.middleware())
app.post('/viber/webhook', (request, response) => {
  console.log(request.body)
  response.send({
    "status": 0,
    "status_message": "ok",
    "event_types": ["delivered", "seen"]
  })
})
bot.setWebhook('https://integration-test-rubio.herokuapp.com/viber/webhook')
  .catch(error => console.error(error))