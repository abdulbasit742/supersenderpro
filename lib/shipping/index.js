'use strict';
// #58 Shipping & Delivery Tracking — barrel.
const { CONFIG } = require('./config');
const engine = require('./shippingEngine');
const shipmentStore = require('./shipmentStore');
const notify = require('./notify');
const privacy = require('./privacy');
const doctor = require('./doctor');

module.exports = {
  CONFIG,
  createShipment: engine.createShipment,
  updateStatus: engine.updateStatus,
  track: engine.track,
  list: engine.list,
  get: engine.get,
  canTransition: shipmentStore.canTransition,
  draftFor: notify.draftFor,
  maskShipment: privacy.maskShipment,
  doctor
};
