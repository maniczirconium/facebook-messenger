'use strict'

const express    = require('express'),
      bodyParser = require('body-parser'),
      request    = require('request'),
      app        = express().use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN

app.listen(process.env.PORT || 1337, () => console.log('Webhook is listening: ' + process.env.PORT || 1337))

app.post('/webhook', (req, res) => {
  const body = req.body

  if(body.object === 'page') {
    body.entry.forEach(entry =>  {
      const webhook_event = entry.messaging[0]
      console.log(webhook_event)

      const sender_psid = webhook_event.sender.id
      console.log(`Sender PSID: ${sender_psid}`)
    
      if(webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message)
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback)
      }
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

function handleMessage(sender_psid, received_message) {
  let response

  if(received_message.text) {
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }
  }

  callSendAPI(sender_psid, response)
}

function handlePostback(sender_psid, received_postback) {}

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