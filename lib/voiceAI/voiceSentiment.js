// lib/voiceAI/voiceSentiment.js — Simple lexicon sentiment for voice transcripts.
// Returns positive / neutral / negative. No external AI call.

const POS = ['thanks', 'shukria', 'great', 'acha', 'best', 'love', 'pasand', 'good', 'khush', 'happy', 'badhiya'];
const NEG = ['bad', 'bura', 'angry', 'ghussa', 'refund', 'late', 'der', 'kharab', 'worst', 'problem', 'masla', 'shikayat', 'cancel', 'never'];

function analyze(text) {
  const t = String(text || '').toLowerCase();
  let score = 0;
  POS.forEach((w) => { if (t.includes(w)) score += 1; });
  NEG.forEach((w) => { if (t.includes(w)) score -= 1; });
  let sentiment = 'neutral';
  if (score > 0) sentiment = 'positive';
  else if (score < 0) sentiment = 'negative';
  return { sentiment, score };
}

module.exports = { analyze };
