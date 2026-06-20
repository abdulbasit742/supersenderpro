// lib/voiceAI/voiceIntentClassifier.js — Lightweight rule-based intent detection for voice
// note transcripts. Supports English / Roman Urdu keywords. No external AI call.

const INTENTS = [
  { intent: 'order', kw: ['order', 'buy', 'kharid', 'lena', 'chahiye', 'cart', 'checkout'] },
  { intent: 'payment', kw: ['payment', 'paisa', 'paise', 'pay', 'bill', 'invoice', 'baqaya', 'due', 'transfer'] },
  { intent: 'support', kw: ['help', 'support', 'problem', 'masla', 'issue', 'kharab', 'broken', 'not working', 'kaam nahi'] },
  { intent: 'complaint', kw: ['complaint', 'shikayat', 'refund', 'wapas', 'bad', 'galat', 'late', 'der'] },
  { intent: 'delivery', kw: ['delivery', 'shipping', 'parcel', 'courier', 'track', 'kab aaye', 'pohanch'] },
  { intent: 'pricing', kw: ['price', 'rate', 'qeemat', 'kitne', 'kitna', 'cost', 'discount', 'sasta'] },
  { intent: 'greeting', kw: ['hello', 'salam', 'assalam', 'hi', 'hey', 'good morning'] },
];

function classify(text) {
  const t = String(text || '').toLowerCase();
  let best = { intent: 'general', score: 0 };
  for (const def of INTENTS) {
    const score = def.kw.reduce((s, k) => s + (t.includes(k) ? 1 : 0), 0);
    if (score > best.score) best = { intent: def.intent, score };
  }
  return { intent: best.intent, confidence: best.score === 0 ? 0.3 : Math.min(0.95, 0.5 + best.score * 0.15) };
}

module.exports = { classify, INTENTS };
