'use strict';
// #86 Multi-Language & Localization — self-diagnostic.
const config = require('./config');
const store = require('./store');

function check() {
  const ok = [], issues = [];
  if (!config.supported.includes(config.defaultLocale)) issues.push('defaultLocale not in supported list');
  else ok.push('default=' + config.defaultLocale);
  ok.push('supported: ' + config.supported.join(','));
  try { require('franc'); ok.push('franc detector available'); } catch (_) { issues.push('franc not installed (detection degraded)'); }
  if (config.translateViaLLM) {
    try { require('../llmHub'); ok.push('llmHub bridge available'); } catch (_) { ok.push('llmHub bridge absent (passthrough)'); }
  } else ok.push('LLM translate disabled');
  let db; try { db = store.load(); ok.push('store readable'); } catch (e) { issues.push('store unreadable: ' + e.message); }
  const contacts = db ? Object.keys(db.contacts || {}).length : 0;
  const memory = db ? Object.keys(db.memory || {}).length : 0;
  return { dept: 'localization', enabled: config.enabled, ok, issues, stats: { contacts, memoryEntries: memory }, healthy: issues.length === 0 };
}
module.exports = { check };
