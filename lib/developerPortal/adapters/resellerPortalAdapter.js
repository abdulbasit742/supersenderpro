// developerPortal/adapters/resellerPortalAdapter.js — safe adapter for Reseller Portal.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Reseller Portal', detectFiles:['lib/resellerNetwork.js', 'lib/referralProgram.js'], events:['reseller.referral_created', 'reseller.commission_preview_generated'] });
