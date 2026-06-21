// lib/platformControl/checkCommandInventory.js — check/lint/test/smoke scripts.
 'use strict';
 const cfg = require('./config');


 function checkCommandInventory() {
   const pkg = cfg.readJSON('package.json') || {};
     const scripts = pkg.scripts || {};
     const checkCommandsPreview = Object.keys(scripts)
       .filter((n) => /check|lint|test|smoke|verify|audit/i.test(n))
       .map((n) => ({ name: n }));
     return cfg.base({ checkCommandsPreview });
 }

 module.exports = { checkCommandInventory };
