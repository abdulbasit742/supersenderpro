'use strict';
// #58 Shipping & Delivery Tracking — config
// All advisory/draft-safe by default. No live carrier API calls; no auto-sends.

const CONFIG = {
  // Status lifecycle (ordered). Terminal/branch states handled in shipmentStore.
  STATUSES: [
    'label_created',
    'in_transit',
    'out_for_delivery',
    'delivered'
  ],
  BRANCH_STATUSES: ['exception', 'returned'],

  // Allowed forward transitions. Exceptions/returns can happen from most live states.
  TRANSITIONS: {
    label_created: ['in_transit', 'exception', 'returned'],
    in_transit: ['out_for_delivery', 'exception', 'returned'],
    out_for_delivery: ['delivered', 'exception', 'returned'],
    delivered: [],
    exception: ['in_transit', 'out_for_delivery', 'returned'],
    returned: []
  },

  // Known carriers (informational only — no API integration).
  CARRIERS: ['tcs', 'leopards', 'mp', 'callcourier', 'dhl', 'fedex', 'ups', 'other'],

  // Which status changes generate a draft customer notification.
  NOTIFY_ON: ['in_transit', 'out_for_delivery', 'delivered', 'exception'],

  DEFAULTS: {
    carrier: 'other',
    notifyCustomer: true // draft only — never auto-sent
  }
};

module.exports = { CONFIG };
