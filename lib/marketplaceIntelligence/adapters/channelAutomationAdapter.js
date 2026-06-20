'use strict';
/** channelAutomationAdapter.js — normalize Channel Automation Command Center logs/posts.
 *  Consumes already-fetched channel post objects; does NOT touch the channel module. */
const { fromText } = require('./base');

/** payload: { posts:[{text,channelId,channelName}], ... } */
function toSignals(payload = {}, existingSkus = []) {
  const items = payload.posts || (Array.isArray(payload) ? payload : [payload]);
  return items.map(p => fromText({
    text: p.text || p.content?.text, who: p.channelId || p.sourceId, name: p.channelName || p.sourceName,
    sourceType: 'channel', sourceId: p.channelId || payload.sourceId, sourceName: p.channelName || payload.sourceName,
    confidence: 0.6
  }, existingSkus));
}
module.exports = { toSignals };
