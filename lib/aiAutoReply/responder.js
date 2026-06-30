// lib/aiAutoReply/responder.js — The core. Given an inbound message, decide and produce a reply:
//  1. kill switch / disabled -> noop
//  2. explicit human request OR low confidence -> handoff (no auto-answer)
//  3. per-contact cooldown -> skip (avoid rapid-fire)
//  4. business hours -> after-hours notice outside the window
//  5. otherwise -> FAQ-grounded reply via llmHub (or local fallback)
// Reply is DRAFT-ONLY unless live send + a notifier are enabled. Every decision is recorded.

const store = require('./store');
const { config } = require('./config');
const faqStore = require('./faqStore');
const intent = require('./intent');
const llmBridge = require('./llmBridge');
const notify = require('./notify');
const { maskContact } = require('./privacy');

const MIN = 60 * 1000;

function _inBusinessHours(date) {
 const h = date.getHours();
 const { businessStartHour: s, businessEndHour: e } = config;
 if (s === e) return true;
 return s < e ? (h >= s && h < e) : (h >= s || h < e);
}
function _onCooldown(contact, refNow) {
 const d = store.load();
 const last = d.cooldowns[String(contact)];
 return last ? (refNow - Date.parse(last)) < config.cooldownMinutes * MIN : false;
}
function _stampCooldown(contact, iso) { const d = store.load(); d.cooldowns[String(contact)] = iso; store.save(d); }

function _record(rec) { const d = store.load(); d.replies.push(rec); if (d.replies.length > 5000) d.replies = d.replies.slice(-5000); store.save(d); return rec; }

function _buildPrompt(text, faq) {
 const grounding = faq ? `Known answer to use as the basis: "${faq.answer}"` : 'No specific FAQ matched; answer helpfully and briefly.';
 return [
 'You are a concise, friendly customer-support assistant for SuperSender (a WhatsApp business tool).',
 grounding,
 `Customer message: "${String(text || '').slice(0, 500)}"`,
 'Reply in the customer\'s language, 1-3 short sentences. If unsure, offer to connect a human.',
 ].join('\n');
}

async function handle({ contact, text = '', refNow = Date.now(), dryRun } = {}) {
 if (!contact) throw new Error('contact is required');
 const now = new Date(refNow);
 const useDry = dryRun === undefined ? !config.effective.liveSend : !!dryRun;

 const base = { id: store.genId('rep'), contactMasked: maskContact(contact), inbound: String(text || '').slice(0, 200), at: now.toISOString() };

 if (!config.enabled || config.killSwitch) {
 return _record({ ...base, action: 'noop', reason: config.killSwitch ? 'kill_switch' : 'disabled' });
 }
 if (intent.wantsHuman(text)) {
 return _record({ ...base, action: 'handoff', reason: 'explicit_human_request', confidence: 1 });
 }
 if (_onCooldown(contact, refNow)) {
 return _record({ ...base, action: 'skip', reason: 'cooldown' });
 }

 const faqs = faqStore.list();
 const m = intent.match(text, faqs);
 if (m.confidence < config.minConfidence && !_inBusinessHours(now)) {
 // After hours, low confidence: send the after-hours notice (still useful) and flag handoff.
 const res = await notify.dispatch(contact, config.afterHoursMessage, { kind: 'ai_after_hours' });
 _stampCooldown(contact, now.toISOString());
 return _record({ ...base, action: 'after_hours', confidence: m.confidence, reply: { text: config.afterHoursMessage, sent: res.sent, draft: !res.sent } });
 }
 if (m.confidence < config.minConfidence) {
 return _record({ ...base, action: 'handoff', reason: 'low_confidence', confidence: m.confidence });
 }

 // Confident enough: produce an FAQ-grounded answer via the hub (or fallback).
 const prompt = _buildPrompt(text, m.faq);
 const completion = await llmBridge.complete({ prompt, faqAnswer: m.faq ? m.faq.answer : null, dryRun: useDry });
 let replyText = String(completion.text || '').slice(0, config.maxReplyChars);
 if (!_inBusinessHours(now)) replyText = `${replyText}\n\n(${config.afterHoursMessage})`;

 const res = await notify.dispatch(contact, replyText, { kind: 'ai_reply', faqId: m.faq ? m.faq.id : null });
 _stampCooldown(contact, now.toISOString());
 return _record({
 ...base, action: 'reply', confidence: m.confidence, faqId: m.faq ? m.faq.id : null,
 source: completion.source, inBusinessHours: _inBusinessHours(now),
 reply: { text: replyText, sent: res.sent, draft: !res.sent, preview: res.preview || replyText },
 });
}

function recent(limit = 100) { return store.load().replies.slice(-limit).reverse(); }

function overview() {
 const d = store.load();
 const by = (a) => d.replies.filter((r) => r.action === a).length;
 return {
 generatedAt: store.nowIso(),
 liveSend: config.effective.liveSend,
 killSwitch: config.killSwitch,
 hubAvailable: llmBridge.hubAvailable(),
 cards: {
 total: d.replies.length,
 replied: by('reply'),
 handoffs: by('handoff'),
 afterHours: by('after_hours'),
 skipped: by('skip'),
 faqs: d.faqs.length,
 },
 };
}

module.exports = { handle, recent, overview };
