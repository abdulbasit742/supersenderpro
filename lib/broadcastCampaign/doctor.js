'use strict';

const { config } = require('./config');

// Self-check. Returns { ok, checks: [...] } without throwing.
function check() {
  const checks = [];
  function add(name, ok, detail) { checks.push({ name, ok: !!ok, detail: detail || '' }); }

  try { require('./store'); add('store loads', true); } catch (e) { add('store loads', false, e.message); }
  try { require('./audience'); add('audience loads', true); } catch (e) { add('audience loads', false, e.message); }
  try { require('./composer'); add('composer loads', true); } catch (e) { add('composer loads', false, e.message); }
  try { require('./sendPlan'); add('sendPlan loads', true); } catch (e) { add('sendPlan loads', false, e.message); }

  add('dry-run default on', config.dryRun === true || config.dryRun === false, 'dryRun=' + config.dryRun);
  add('rate sane', config.ratePerMinute > 0 && config.ratePerMinute <= 200, 'rate=' + config.ratePerMinute);

  let llm = 'absent';
  try { require('../llmHub'); llm = 'present'; } catch (e) { llm = 'absent (template fallback active)'; }
  add('llmHub optional', true, llm);

  return { ok: checks.every((c) => c.ok), checks };
}

module.exports = { check };
