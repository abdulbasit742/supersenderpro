'use strict';
// #86 Multi-Language & Localization — translation with memory + optional llmHub.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');

function hash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }
function memKey(targetLocale, text) { return `${targetLocale}:${hash(text)}`; }

// Translate text into targetLocale. Returns { text, source } where source = memory|llm|passthrough.
async function translate(db, { text, targetLocale, sourceLocale }) {
  if (!text) return { text: '', source: 'passthrough' };
  const target = (targetLocale || config.defaultLocale).toLowerCase();
  if (target === (sourceLocale || '').toLowerCase()) return { text, source: 'passthrough' };
  // Translation memory hit?
  db.memory = db.memory || {};
  const k = memKey(target, text);
  if (db.memory[k]) return { text: db.memory[k], source: 'memory' };
  // Try llmHub (local Ollama by default per project setup).
  if (config.translateViaLLM) {
    try {
      const hub = require('../llmHub');
      if (hub && typeof hub.complete === 'function') {
        const prompt = `Translate the following message into ${target} (ISO 639-1). Keep tone, placeholders like {name} and URLs unchanged. Return only the translation, no quotes.\n\n${text}`;
        const out = await hub.complete({ prompt, system: 'You are a precise translator for business WhatsApp messages.' });
        const translated = (out && (out.text || out.content || out.output)) ? String(out.text || out.content || out.output).trim() : null;
        if (translated) { db.memory[k] = translated; return { text: translated, source: 'llm' }; }
      }
    } catch (_) { /* llmHub absent or dry-run — fall through */ }
  }
  // Advisory fallback: return original, flag untranslated.
  return { text, source: 'passthrough', untranslated: true };
}

// Seed a manual translation into memory (overrides LLM).
function remember(db, { targetLocale, text, translation }) {
  db.memory = db.memory || {};
  db.memory[memKey((targetLocale || config.defaultLocale).toLowerCase(), text)] = translation;
  return true;
}
module.exports = { translate, remember, memKey };
