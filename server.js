const express = require('express')
const bodyParser = require('body-parser')
const RTM = require('satori-rtm-sdk')
const cuid = require('cuid')

const port = 3000

const server = express()
const jsonParser = bodyParser.json()


const calls = []
const conversations = {}

server.use(jsonParser)

server.get('/answer', (req, res) => {
  const userId = cuid()

  console.log(req.url + ' => ' + userId)
  const call = {userId,from: req.query.from}
  console.log(`CALL: ${JSON.stringify(call)}`)

  calls.push(call)

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
          'content-type': 'audio/l16rate=16000',
          'headers': {
            'aws_key': 'AKIAIDAFIZEIGKK775AA',
            'aws_secret': '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'
          },
          'type': 'websocket',
          'uri': `wss://lex-us-east-1.nexmo.com/bot/donate/alias/staging/user/${userId}/content`
        }
      ],
      'eventUrl': [
        `http://105d8588.ngrok.io/event/${userId}`
      ]
    }
  ]


  return res.json(ncco)
})

server.post('/event/:userId?', (req, res) => {
  const body = req.body

  console.log(req.url + '=>' + JSON.stringify(req.body))
  res.send()
})

server.listen(port, (err) => {
  if (err) throw err
  console.log(`> Ready on http://localhost:${port}`)
})


const rtm = new RTM('wss://og3ayb2g.api.satori.com', 'D364dDfea10C2F3eede8e5DE92e3A88B')

const channel = rtm.subscribe('disrupt', RTM.SubscriptionMode.SIMPLE)

channel.on("rtm/subscription/data", function(pdu) {
  pdu.body.messages.forEach(msg => {
    console.log(JSON.stringify(msg))
  })
})

rtm.on("data", function(pdu) {
  if (pdu.action.endsWith("/error")) {
    rtm.restart()
  }
})

rtm.start()
