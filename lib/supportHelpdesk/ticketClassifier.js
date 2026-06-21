'use strict';
const CATEGORIES = ['onboarding','setup_issue','billing','payment','whatsapp_connection','channel_automation','ecommerce','voice_ai','ai_agent','public_funnel','bug','feature_request','training','compliance','other'];
const KEYWORDS = {
  billing: [/bill/i,/invoice/i,/charge/i,/plan/i], payment: [/payment/i,/easypaisa/i,/jazzcash/i,/refund/i],
  whatsapp_connection: [/whatsapp/i,/disconnect/i,/qr/i,/number/i], channel_automation: [/channel/i,/post/i,/publish/i],
  ecommerce: [/order/i,/product/i,/stock/i,/cart/i], voice_ai: [/voice/i,/call/i,/transcript/i], ai_agent: [/agent/i,/ai reply/i,/bot/i],
  public_funnel: [/funnel/i,/landing/i,/signup/i], bug: [/bug/i,/error/i,/crash/i,/broken/i,/not work/i],
  feature_request: [/feature/i,/request/i,/can you add/i,/wish/i], onboarding: [/onboard/i,/setup/i,/getting started/i,/how do i/i],
  compliance: [/consent/i,/opt.?out/i,/privacy/i], training: [/how to/i,/tutorial/i,/guide/i],
};
function classify(text) {
  const t = String(text || '');
  let category = 'other';
  for (const [cat, pats] of Object.entries(KEYWORDS)) { if (pats.some((re) => re.test(t))) { category = cat; break; } }
  const neg = /(angry|frustrat|terrible|worst|refund|cancel|broken|useless|scam|disappoint)/i.test(t);
  const pos = /(thanks|great|love|awesome|perfect|helpful)/i.test(t);
  return { category, sentiment: neg ? 'negative' : (pos ? 'positive' : 'neutral') };
}
module.exports = { CATEGORIES, classify };
