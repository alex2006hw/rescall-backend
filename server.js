const express = require('express')
const bodyParser = require('body-parser')

const port = 3000

const server = express()
const jsonParser = bodyParser.json()

const ncco = [
  {
    'action': 'talk',
    'text': 'Hello there. How can I help you?',
    'voiceName': 'Salli'
  },
  {
    'action': 'connect',
    'endpoint': [
      {
        'content-type': 'audio/l16;rate=16000',
        'headers': {
          'aws_key': 'AKIAIDAFIZEIGKK775AA',
          'aws_secret': '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'
        },
        'type': 'websocket',
        'uri': 'wss://lex-us-east-1.nexmo.com/bot/donate/alias/staging/user/lexconvaid/content'
      }
    ],
    'eventUrl': [
      'http://cd6ddfdf.ngrok.io/event'
    ]
  }
]

server.use(jsonParser)

server.get('/answer', (req, res) => {
  return res.json(ncco)
})

server.post('/event', (req, res) => {
  console.log(JSON.stringify(req.body))
  res.send()
})

server.listen(port, (err) => {
  if (err) throw err
  console.log(`> Ready on http://localhost:${port}`)
})
