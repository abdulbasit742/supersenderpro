// lib/ownerBriefing/index.js — Barrel export for the Owner Briefing & Daily Autopilot.
module.exports = {
  config: require('./config').config,
  privacy: require('./privacy'),
  store: require('./store'),
  dataSources: require('./dataSources'),
  kpiBuilder: require('./kpiBuilder'),
  alertRules: require('./alertRules'),
  actionItems: require('./actionItems'),
  briefingBuilder: require('./briefingBuilder'),
  deliveryAdapter: require('./deliveryAdapter'),
  scheduler: require('./scheduler'),
  historyStore: require('./historyStore'),
};
