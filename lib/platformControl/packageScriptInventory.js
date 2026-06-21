// lib/platformControl/packageScriptInventory.js — read-only package.json script inventory.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getPackageScripts() {
  let scripts = {};
  try { scripts = JSON.parse(cfg.readText('package.json')).scripts || {}; } catch (_) { scripts = {}; }
  const scriptsPreview = Object.keys(scripts).map((name) => ({ name: safeText(name), command: safeText(scripts[name]) }));
  const dangerousHintPreview = scriptsPreview
    .filter((s) => /rm -rf|reset --hard|force|push -f|prod deploy|deploy:prod/i.test(s.command))
    .map((s) => s.name);
  return cfg.safetyFlags({
    scriptsPreview,
    totalPreview: scriptsPreview.length,
    platformControlScriptsPreview: scriptsPreview.filter((s) => s.name.startsWith('platform-control')).map((s) => s.name),
    dangerousHintPreview,
    warnings: [], blockers: [],
  });
}
module.exports = { getPackageScripts };
