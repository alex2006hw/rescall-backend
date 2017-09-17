const R = require('rambda')
const Nexmo = require('nexmo')

const FROM_NUMBER = '12016444271'

const nexmo = new Nexmo({
  apiKey: 'e3c2ffa0',
  apiSecret: '7c09b08a5485b207',
  applicationId: 'cad77659-5f21-468d-8cf7-6215b8ade67c',
  privateKey: '/Users/ernestofreyre/Documents/nodeprojects/nexmo/rooted/private.key'
})

module.exports.addDonation = (dashboard, msg) => {
  const total = dashboard.Donations.total + 1
  const list = dashboard.Donations.list
  const quantity = (msg.intent.quantity && parseInt(msg.intent.quantity)) || 1


  list.push({
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


  list.push({
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
      `http://651e479d.ngrok.io/confcall/${msg.donor}`
    ]
  }, (error, response) => {
    if (error) {
      console.error(error)
    } else {
      console.log(response)
    }
  })
}
