// lib/aiAutoReply/faqStore.js — Knowledge base of question/answer pairs with keyword hints.
// Seeds a few defaults on first use. Used for deterministic matching + as grounding context
// for the LLM. Never hard-deletes; upsert replaces by id.

const store = require('./store');

const DEFAULTS = [
 { id: 'pricing', keywords: ['price', 'pricing', 'cost', 'kitna', 'plan', 'charges'], question: 'How much does it cost?', answer: 'We have monthly plans starting from a Starter tier. Reply "plans" to see the full pricing, or visit our pricing page.' },
 { id: 'trial', keywords: ['trial', 'free', 'demo', 'test'], question: 'Is there a free trial?', answer: 'Yes! You can start a free trial to try SuperSender before paying. Want me to set one up?' },
 { id: 'support_hours', keywords: ['hours', 'open', 'timing', 'available', 'kab'], question: 'What are your support hours?', answer: 'Our team is available during business hours. Outside that we reply as soon as we are back online.' },
 { id: 'refund', keywords: ['refund', 'money back', 'cancel', 'wapas'], question: 'Can I get a refund?', answer: 'We can help with refunds and cancellations. Let me connect you to the billing team to sort this out.' },
];

function _seed() { const d = store.load(); if (!d.faqs.length) { d.faqs = DEFAULTS.slice(); store.save(d); } return d.faqs; }
function list() { return _seed(); }
function upsert(faq) {
 _seed();
 const d = store.load();
 const rec = { id: faq.id || store.genId('faq'), keywords: Array.isArray(faq.keywords) ? faq.keywords.map(String) : [], question: String(faq.question || ''), answer: String(faq.answer || '') };
 const idx = d.faqs.findIndex((f) => f.id === rec.id);
 if (idx >= 0) d.faqs[idx] = rec; else d.faqs.push(rec);
 store.save(d);
 return rec;
}
function remove(id) { const d = store.load(); d.faqs = d.faqs.filter((f) => f.id !== id); store.save(d); return true; }

module.exports = { list, upsert, remove, DEFAULTS };
