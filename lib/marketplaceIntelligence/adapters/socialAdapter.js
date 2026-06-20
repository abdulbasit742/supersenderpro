'use strict';
/** socialAdapter.js — normalize social posts (FB/IG/LinkedIn/TikTok/Telegram) into signals. */
const { fromText } = require('./base');

/** payload: { posts:[{text,platform,pageId,pageName}], ... } */
function toSignals(payload = {}, existingSkus = []) {
  const items = payload.posts || (Array.isArray(payload) ? payload : [payload]);
  return items.map(p => fromText({
    text: p.text || p.caption, who: p.pageId || p.platform, name: p.pageName || p.platform,
    sourceType: 'social', sourceId: p.pageId || p.platform || payload.platform, sourceName: p.pageName || p.platform,
    confidence: 0.55
  }, existingSkus));
}
module.exports = { toSignals };
