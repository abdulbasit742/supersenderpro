// lib/platformControl/checkCommandInventory.js — read-only inventory of check/test/lint commands (no execution).
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getCheckCommands() {
  let scripts = {};
  try { scripts = JSON.parse(cfg.readText('package.json')).scripts || {}; } catch (_) { scripts = {}; }
  const all = Object.keys(scripts);
  const checkCommandsPreview = all.filter((n) => /(:check|:smoke|^test|^check|^lint|doctor|status|health|launch)/i.test(n))
    .map((n) => ({ name: safeText(n), command: safeText(scripts[n]) }));
  const dangerousCommandsPreview = all.filter((n) => /rm -rf|reset --hard|force|push -f|deploy:prod|prod deploy/i.test(scripts[n] || ''))
    .map(safeText);
  return cfg.safetyFlags({
    liveScriptExecution: false,
    checkCommandsPreview,
    dangerousCommandsPreview,
    platformControlCommandsPreview: all.filter((n) => n.startsWith('platform-control')).map(safeText),
    totalPreview: checkCommandsPreview.length,
    warnings: [], blockers: [],
  });
}
module.exports = { getCheckCommands };
