const RTM = require('satori-rtm-sdk')

// create an RTM client instance

module.exports.convaid = (event, context, callback) => {
  const rtm = new RTM('wss://og3ayb2g.api.satori.com', 'D364dDfea10C2F3eede8e5DE92e3A88B')
  console.log(JSON.stringify(event))

  rtm.on('enter-connected', function() {
    const convaidEvent = { type: 'convaid', event }
    const convaidResponse = {
      'dialogAction': {
        'type': 'Close',
        'fulfillmentState': 'Fulfilled'
      }
    }

    rtm.publish('disrupt', convaidEvent)
    callback(null, convaidResponse)

    rtm.stop()
  })

  rtm.start()
}
