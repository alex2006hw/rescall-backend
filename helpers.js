const R = require('rambda')
const Nexmo = require('nexmo')
require('dotenv').config()

const FROM_NUMBER = process.env.RESCALL

const nexmo = new Nexmo({
  apiKey: 'e3c2ffa0',
  apiSecret: '7c09b08a5485b207',
  applicationId: 'cad77659-5f21-468d-8cf7-6215b8ade67c',
  privateKey: './private.key'
})

module.exports.addDonation = (dashboard, msg) => {
  const total = dashboard.Donations.total + 1
  const list = dashboard.Donations.list
  const quantity = (msg.intent.quantity && parseInt(msg.intent.quantity)) || 1


  list.splice(0, 0, {
    from: msg.from,
    resource: msg.intent.resource,
    quantity,
    measureUnit: msg.intent.measureunit
  })

  const resourceTotal = R.find(R.propEq('name', msg.intent.resource))(dashboard.totals)
  if (!resourceTotal) {
    dashboard.totals.push({
      name: msg.intent.resource,
      value: quantity,
      measureUnit: msg.intent.measureunit || ''
    })
  } else {
    resourceTotal.value = resourceTotal.value + quantity
  }

  dashboard.Donations.total = total
  dashboard.Donations.list = list

  return dashboard
}


module.exports.addNeed = (dashboard, msg) => {
  const total = dashboard.Needs.total + 1
  const list = dashboard.Needs.list
  const quantity = (msg.intent.quantity && parseInt(msg.intent.quantity)) || 1


  list.splice(0, 0, {
    from: msg.from,
    resource: msg.intent.resource,
    quantity,
    measureUnit: msg.intent.measureunit
  })

  dashboard.Needs.total = total
  dashboard.Needs.list = list

  return dashboard
}

module.exports.makeConfCall = msg => {
  nexmo.calls.create({
    from: {
      type: 'phone',
      number: FROM_NUMBER
    },
    to: [{
      type: 'phone',
      number: msg.need
    }],
    answer_url: [
      `${process.env.URL}/confcall/${msg.donor}`
    ]
  }, (error, response) => {
    if (error) {
      console.error(error)
    } else {
      console.log(response)
    }
  })
}

module.exports.sendSMS = (to, donation) => {
  const nexmo = new Nexmo({
    apiKey: 'e3c2ffa0',
    apiSecret: '7c09b08a5485b207'
  })

  const from = FROM_NUMBER
  const text = `Rescall here, how much ${donation.resource} do you have left? ${donation.measureUnit && `(in ${donation.measureUnit})`}`

  console.log('SENDING SMS to ' + to + ' => ' + text)
  nexmo.message.sendSms(from, to, text)
}

