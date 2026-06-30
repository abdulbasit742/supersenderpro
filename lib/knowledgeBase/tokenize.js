// lib/knowledgeBase/tokenize.js — Tiny text tokenizer for search: lowercase, strip punctuation,
// split on whitespace, drop very short tokens + a small English/Roman-Urdu stopword set. No deps.

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'or', 'in', 'on', 'for', 'do', 'i', 'you', 'we', 'it', 'my', 'me', 'how', 'what', 'can', 'will', 'with', 'your', 'hai', 'ka', 'ki', 'ko', 'me', 'mein', 'kya', 'kaise', 'aur', 'se']);

function tokens(text) {
 return String(text == null ? '' : text)
 .toLowerCase()
 .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
 .split(/\s+/)
 .filter((t) => t.length >= 2 && !STOP.has(t));
}

function termFreq(text) {
 const tf = {};
 for (const t of tokens(text)) tf[t] = (tf[t] || 0) + 1;
 return tf;
}

module.exports = { tokens, termFreq, STOP };
