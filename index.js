'use strict'

const express    = require('express'),
      bodyParser = require('body-parser'),
      app        = express().use(bodyParser.json());

app.listen(process.env.PORT || 1337, () => console.log('Webhook is listening: ' + process.env.PORT || 1337))

app.post('/webhook', (req, res) => {
  const body = req.body

  if(body.object === 'page') {
    body.entry.forEach(entry =>  {
      const webhook_event = entry.messaging[0]
      console.log(webhook_event)
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