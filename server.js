require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const RTM = require('satori-rtm-sdk')
const cuid = require('cuid')
const R = require('rambda')
const { addDonation, addNeed, makeConfCall, sendSMS } = require('./helpers')

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
      "value": 65,
      "measureUnit": "Beds"
    }
  ],
  "Donations": {
    "total": 346,
    "list": [
      {
        "from": "15101115555",
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
    "total": 508,
    "list": [
      {
        "from": "15102228876",
        "resource": "water",
        "quantity": null,
        "measureUnit": null
      },
      {
        "from": "15108876668",
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
          'content-type': 'audio/l16;rate=16000',
          'headers': {
            'aws_key': process.env.KEY,
            'aws_secret': process.env.SECRET
          },
          'type': 'websocket',
          // 'uri': `wss://sammachin.ngrok.io/bot/donate/alias/staging/user/1234/content`
          'uri': `wss://lex-us-east-1.nexmo.com/bot/donate/alias/staging/user/${userId}/content`
        }
      ],
      'eventUrl': [
        `${process.env.URL}/event/${userId}`
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
        `${process.env.URL}/confcall-events/${req.params.donor}`,
        `${process.env.URL}/confcall-backup/${req.params.donor}`,
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
  const body = req.body
  const donor = req.params.donor

  if (body.status === 'completed') {
    const donations = R.filter(R.propEq('from', donor))(dashboard.Donations.list)

    console.log(donations)
    if (donations.length > 0) {
      sendSMS(donor, donations[0])
    }
  }

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

server.get('/incoming-sms', (req, res) => {
  console.log(req.query)
  const q = req.query

  const donor = R.filter(R.propEq('from', q.msisdn))(dashboard.Donations.list)
  console.log(donor)
  if (donor.length > 0) {
    const quantity = parseInt(q.text)

    donor[0].quantity = quantity

    const total = R.filter(R.propEq('name', donor[0].resource))(dashboard.totals)
    if (total.length > 0) {
      total[0].value = total[0].value - quantity
    }

    rtm.publish('disrupt', dashboard)
  }

  res.sendStatus(200)
})


const rtm = new RTM('wss://og3ayb2g.api.satori.com', 'D364dDfea10C2F3eede8e5DE92e3A88B')

const channel = rtm.subscribe('disrupt', RTM.SubscriptionMode.SIMPLE)

channel.on("rtm/subscription/data", function(pdu) {
  pdu.body.messages.forEach(msg => {
    if (msg.type === 'convaid' && msg.event.currentIntent) {
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
