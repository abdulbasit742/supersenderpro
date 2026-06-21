'use strict';
const TEMPLATES = {
  welcome_email: { subject: 'Welcome to {{business}}', body: 'Hi {{firstName}}, thanks for joining {{business}}! Here is how to get started.' },
  cart_email: { subject: 'You left something behind', body: 'Hi {{firstName}}, your cart is still waiting. Complete your order anytime.' },
  payment_email: { subject: 'Quick reminder about your order', body: 'Hi {{firstName}}, we noticed your payment is still pending. Need help?' },
  followup_email: { subject: 'How was your order?', body: 'Hi {{firstName}}, hope you love it. Reply if anything is off.' },
  winback_email: { subject: 'We miss you, {{firstName}}', body: 'It has been a while. Here is a little something to welcome you back.' },
  review_email: { subject: 'Mind leaving a quick review?', body: 'Hi {{firstName}}, your feedback helps a lot. It takes 30 seconds.' },
  support_email: { subject: 'Your ticket is resolved', body: 'Hi {{firstName}}, your support request is closed. Reply if you need more.' },
  nurture_email_1: { subject: 'Getting the most from {{business}}', body: 'Tip #1 to get value fast.' },
  nurture_email_2: { subject: 'One more idea for you', body: 'Tip #2, building on the last.' },
};
const UNSUB_FOOTER = '\n---\nYou are receiving this because you opted in. Unsubscribe: {{unsubscribeUrl}}';
function fill(str, vars) { return String(str).replace(/{{(\w+)}}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m)); }
function list() { return Object.keys(TEMPLATES).map((id) => ({ id, subject: TEMPLATES[id].subject })); }
function render(templateId, vars) {
  const t = TEMPLATES[templateId] || { subject: '(missing template)', body: '' };
  const v = Object.assign({ business: 'SuperSender Pro', firstName: 'there', unsubscribeUrl: 'https://example.com/unsub/demo' }, vars || {});
  return { templateId, subjectPreview: fill(t.subject, v), bodyPreview: fill(t.body, v) + fill(UNSUB_FOOTER, v), unsubscribeIncluded: true };
}
module.exports = { list, render, TEMPLATES };
