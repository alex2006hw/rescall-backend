const express = require('express')
const bodyParser = require('body-parser')
const RTM = require('satori-rtm-sdk')
const cuid = require('cuid')
const R = require('rambda')
const { addDonation, addNeed, makeConfCall } = require('./helpers')

const FROM_NUMBER = '12016444271'
let dashboard = {
  "type": "dashboard",
  "totals": [
    {
      "name": "water",
      "value": 100,
      "measureUnit": "Gal"
    },
    {
      "name": "food",
      "value": 245,
      "measureUnit": "Lb"
    },
    {
      "name": "beds",
      "value": 565,
      "measureUnit": "Beds"
    }
  ],
  "Donations": {
    "total": 5,
    "list": [
      {
        "from": "17863328464",
        "resource": "water",
        "quantity": 10,
        "measureUnit": "gallons"
      },
      {
        "from": "17863328464",
        "resource": "food",
        "quantity": 20,
        "measureUnit": "pounds"
      }
    ]
  },
  "Needs": {
    "total": 500,
    "list": [
      {
        "from": "17864690827",
        "resource": "water",
        "quantity": null,
        "measureUnit": null
      },
      {
        "from": "12673939834",
        "resource": "bed",
        "quantity": 2,
        "measureUnit": "beds"
      }
    ]
  }
}

const port = 3000

const server = express()
const jsonParser = bodyParser.json()

const fakeDonorId = 'cj7ofzn4c0000gwzl10oyo0tk'
const fakeNeedId = 'cj7ofzn4c0000gwzl10oyo2tk'

const calls = [
  {userId: fakeDonorId, from: '17863328464'},
  {userId: fakeNeedId, from: '18586105765'}
]

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

server.get('/confcall/:donor', (req, res) => {
  const ncco = [
    {
      "action": "talk",
      "text": "Please wait while we connect you with a donor"
    },
    {
      "action": "connect",
      "eventUrl": [
        `http://651e479d.ngrok.io/confcall-events/${req.params.donor}`,
        `http://651e479d.ngrok.io/confcall-backup/${req.params.donor}`,
      ],
      "timeout": "45",
      "from": FROM_NUMBER,
      "endpoint": [
        {
          "type": "phone",
          "number": req.params.donor
        }
      ]
    }
  ]

  res.json(ncco)
})

server.post('/confcall-events/:donor', (req, res) => {
  console.log('CONFCALL-EVENT: ' + req.url + ' => ' + JSON.stringify(req.body))
  res.send()
})

server.post('/confcall-backup/:donor', (req, res) => {
  console.log('CONFCALL-BACKUP: ' + req.url + ' => ' + JSON.stringify(req.body))
  res.send()
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
    if (msg.type === 'convaid') {
      const intent = msg.event.currentIntent.slots
      const userId = msg.event.userId

      const call = R.find(R.propEq('userId', userId))(calls)
      const event = {
        type: 'call',
        from: call.from,
        intent
      }

      rtm.publish('disrupt', event);

      return
    }

    if (msg.type === 'call') {
      // Update Dashboard
      const action = msg.intent.action
      if (action === 'donate') {
        dashboard = addDonation(dashboard, msg)
        rtm.publish('disrupt', dashboard)
      }
      if (action === 'get') {
        dashboard = addNeed(dashboard, msg)
        rtm.publish('disrupt', dashboard)

        // Matching and conf call
        const quantity = (msg.intent.quantity && parseInt(msg.intent.quantity)) || 1
        const matching = R.compose(
          R.filter(donation => donation.quantity >= quantity),
          R.filter(R.propEq('resource', msg.intent.resource))
        )(dashboard.Donations.list)

        if (matching.length > 0) {
          const confEvent = {
            type: 'confcall',
            donor: matching[0].from,
            need: msg.from,
            resource: msg.intent.resource,
            quantity
          }
          rtm.publish('disrupt', confEvent)
        }
      }
      return
    }

    if (msg.type === 'confcall') {
      makeConfCall(msg)

      return
    }




  })
})

rtm.on("data", function(pdu) {
  if (pdu.action.endsWith("/error")) {
    rtm.restart()
  }
})


rtm.on("enter-connected", function() {
  rtm.publish('disrupt', dashboard);
});

rtm.start()
