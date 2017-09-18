#!/usr/bin/env node

const RTM = require('satori-rtm-sdk')

const rtm = new RTM('wss://og3ayb2g.api.satori.com', 'D364dDfea10C2F3eede8e5DE92e3A88B')
const needs = require('./mocks/need.json')

rtm.on("enter-connected", function() {
  rtm.publish('disrupt2017', needs)
  rtm.stop()
})

rtm.start()
