// developerPortal/webhookValidator.js — validates subscription inputs.
const { eventTypes } = require('./webhookEventCatalog');
function validate(input={}){
  const errors=[];
  if (!input.url || !/^https?:\/\//i.test(input.url)) errors.push('url must be a valid http(s) URL');
  const known = eventTypes();
  const evts = Array.isArray(input.eventTypes)?input.eventTypes:[];
  if (!evts.length) errors.push('eventTypes must include at least one event');
  const unknown = evts.filter(e=>!known.includes(e) && e!=='*');
  if (unknown.length) errors.push('unknown eventTypes: '+unknown.join(', '));
  return { valid: errors.length===0, errors };
}
module.exports = { validate };
