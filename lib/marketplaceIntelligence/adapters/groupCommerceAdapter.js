'use strict';
/** groupCommerceAdapter.js — normalize WhatsApp group/chat commerce posts. */
const { fromText } = require('./base');

/** payload: { messages:[{text,who,name,city}], sourceId, sourceName, sourceType } */
function toSignals(payload = {}, existingSkus = []) {
  const items = payload.messages || (Array.isArray(payload) ? payload : [payload]);
  const st = payload.sourceType || 'whatsapp_group';
  return items.map(m => fromText({
    text: m.text, who: m.who || m.sender, name: m.name, city: m.city,
    sourceType: st, sourceId: m.sourceId || payload.sourceId, sourceName: m.sourceName || payload.sourceName
  }, existingSkus));
}
module.exports = { toSignals };
