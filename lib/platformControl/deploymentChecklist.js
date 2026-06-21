// lib/platformControl/deploymentChecklist.js — release checklist (existence-based).
  'use strict';
  const cfg = require('./config');

 function deploymentChecklist() {
     const pkg = cfg.readJSON('package.json') || {};
     const scripts = pkg.scripts || {};
     const checklistPreview = [
       { item: 'package.json present', pass: cfg.exists('package.json') },
       { item: 'server entry present', pass: cfg.exists('server.js') || cfg.exists('app.js') },
       { item: 'start script defined', pass: !!scripts.start },
       { item: '.env.example present', pass: cfg.exists('.env.example') },
       { item: 'data folder present', pass: cfg.exists('data') },
       { item: 'smoke tests present', pass: cfg.hasFile([/smoke/i], { exts: ['.js'] }) },
       { item: 'node_modules installed', pass: cfg.exists('node_modules') },
       { item: '.gitignore present', pass: cfg.exists('.gitignore') },
     ];
   return cfg.base({ checklistPreview, passedPreview: checklistPreview.filter((c) => c.pass).length, totalPreview:
 checklistPreview.length });
 }


 module.exports = { deploymentChecklist };
