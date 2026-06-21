  const presets = require('./industryPresets');
  const recommendedPlaybooks = require('./recommendedPlaybooks');
  const recommendedAgents = require('./recommendedAgents');
  const recommendedFlows = require('./recommendedFlows');

  function list() { return presets.list(); }
  function get(id) { return presets.get(id); }
  function forBusinessType(bt) { return presets.presetForBusinessType(bt); }

  function recommendationsFor(presetId) {
       const p = presets.get(presetId);
       if (!p) return null;
       return {
         modules: p.recommendedModules,
         playbooks: recommendedPlaybooks.expand(p.recommendedPlaybooks),
         agents: recommendedAgents.expand(p.recommendedAgents),
         flows: recommendedFlows.expand(p.recommendedPlaybooks),
         channelRules: p.recommendedChannelRules,
         customerTags: p.recommendedCustomerTags,
         ownerDigest: p.recommendedOwnerDigest,
         voiceTemplates: p.recommendedVoiceTemplates,
         ecommerceFields: p.recommendedEcommerceFields,
         paymentMethods: p.recommendedPaymentMethods,
       };
  }

  module.exports = { list, get, forBusinessType, recommendationsFor };
