// developerPortal/webhookReplay.js — replay a previous delivery as a NEW dry-run simulation.
const { deliverPreview } = require('./webhookDeliveryPreview');
async function replayPreview(subscriptionId, eventType, overrides={}){
  const result = await deliverPreview(subscriptionId, eventType || 'generic.system_notice', overrides);
  return { ...result, replay:true, retryPlan:{ maxAttempts:5, backoff:'exponential', baseSeconds:30 } };
}
module.exports = { replayPreview };
