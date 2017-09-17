const Nexmo = require('nexmo')

const FROM_NUMBER = '12016444271'
const TO_NUMBER = '17863328464'

const nexmo = new Nexmo({
  apiKey: 'e3c2ffa0',
  apiSecret: '7c09b08a5485b207',
  applicationId: 'cad77659-5f21-468d-8cf7-6215b8ade67c',
  privateKey: '/Users/ernestofreyre/Documents/nodeprojects/nexmo/rooted/private.key'
})

nexmo.calls.create({
  from: {
    type: 'phone',
    number: FROM_NUMBER
  },
  to: [{
    type: 'phone',
    number: TO_NUMBER
  }],
  answer_url: ['https://nexmo-community.github.io/ncco-examples/first_call_talk.json']
}, (error, response) => {
  if (error) {
    console.error(error)
  } else {
    console.log(response)
  }
})
