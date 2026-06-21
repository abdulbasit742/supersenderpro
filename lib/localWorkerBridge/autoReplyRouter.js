'use strict';
function classify(text) { const t = String(text || '').toLowerCase(); if (!t.trim()) return { intent:'unknown', confidence:0 }; if (/price|rate|kitna|kitne/.test(t)) return { intent:'pricing', confidence:0.8 }; if (/help|support|problem|issue/.test(t)) return { intent:'support', confidence:0.75 }; if (/order|buy|lena/.test(t)) return { intent:'order', confidence:0.75 }; return { intent:'unknown', confidence:0.3 }; }
function routeInbound(input) { const c = classify(input && input.text); return { ok:true, dryRun:true, decision:c, replyPreview:c.intent === 'unknown' ? 'Team se connect kar deta hoon.' : 'Received. Team follow up karegi.' }; }
module.exports = { classify, routeInbound };
