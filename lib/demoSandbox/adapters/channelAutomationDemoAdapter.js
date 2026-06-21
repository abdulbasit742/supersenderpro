'use strict';
const factory = require('../demoDataFactory');
module.exports = { preview: () => ({ demo: true, dryRun: true, channelPostDrafts: factory.whatsapp().channelPostDrafts,
approvalQueue: [{ id: 'demo_appr_0', status: 'pending', demo: true }] }) };
