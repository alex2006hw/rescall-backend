#!/usr/bin/env node

const RTM = require('satori-rtm-sdk')

const rtm = new RTM('wss://og3ayb2g.api.satori.com', 'D364dDfea10C2F3eede8e5DE92e3A88B')
const donating = require('./mocks/donating.json')

rtm.on("enter-connected", function() {
  rtm.publish('disrupt2017', donating)
  rtm.stop()
})

rtm.start()
