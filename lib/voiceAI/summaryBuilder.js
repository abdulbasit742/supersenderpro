// lib/voiceAI/summaryBuilder.js — Builds a short, safe summary of a voice transcript.
// Rule-based by default (no external AI). Redacts PII.

const { preview } = require('./redaction');
const intentClassifier = require('./voiceIntentClassifier');
const sentiment = require('./voiceSentiment');

function build(transcript, { language = 'roman_urdu' } = {}) {
  const intent = intentClassifier.classify(transcript);
  const sent = sentiment.analyze(transcript);
  const snippet = preview(transcript, 120);
  const intentLabel = {
    order: 'Customer wants to place/ask about an order',
    payment: 'Customer is asking about payment / dues',
    support: 'Customer needs support / help',
    complaint: 'Customer raised a complaint',
    delivery: 'Customer is asking about delivery',
    pricing: 'Customer is asking about price',
    greeting: 'Customer greeting',
    general: 'General voice message',
  }[intent.intent] || 'General voice message';
  return {
    summary: `${intentLabel}. Sentiment: ${sent.sentiment}. Note: "${snippet}"`,
    intent: intent.intent,
    sentiment: sent.sentiment,
    language,
  };
}

module.exports = { build };
