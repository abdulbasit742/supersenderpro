// lib/platformControl/packageScriptInventory.js — package.json scripts, dangerous ones flagged.
  'use strict';
  const cfg = require('./config');
  const { redactPackageScript } = require('./redactor');


  const DANGEROUS = /(rm\s+-rf|drop\s+database|--force|push\s+--force|reset\s+--hard|prune|mkfs|format)/i;


  function packageScriptInventory() {
       const pkg = cfg.readJSON('package.json') || {};
       const scripts = pkg.scripts || {};
       const scriptsPreview = Object.keys(scripts).map((name) => ({
         name, command: redactPackageScript(scripts[name]), dangerous: DANGEROUS.test(scripts[name] || ''),
       }));

     const dangerousScriptsPreview = scriptsPreview.filter((s) => s.dangerous).map((s) => s.name);
     return cfg.base({ scriptsPreview, dangerousScriptsPreview });
 }


 module.exports = { packageScriptInventory };
