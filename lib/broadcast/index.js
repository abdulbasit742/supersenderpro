// lib/broadcast/index.js — barrel export for the broadcast dept
'use strict';

const { config } = require('./config');
const store = require('./store');
const engine = require('./broadcastEngine');
const privacy = require('./privacy');
const { resolve } = require('./recipientResolver');
const doctor = require('./doctor');

module.exports = {
  config,
  createCampaign: engine.createCampaign,
  dispatch: engine.dispatch,
  list: store.list,
  get: store.get,
  resolveRecipients: resolve,
  maskRecipients: privacy.maskRecipients,
  doctor,
};
