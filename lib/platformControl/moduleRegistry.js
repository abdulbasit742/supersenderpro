// lib/platformControl/moduleRegistry.js — discovers lib/ modules, classifies by name.
 'use strict';
 const cfg = require('./config');
 const { redactModule } = require('./redactor');

 function categorize(name) {
   const n = String(name).toLowerCase();
      if (/whatsapp|baileys|\bwa\b/.test(n)) return 'messaging';
      if (/cloud|meta|graph/.test(n)) return 'messaging';
      if (/rag|vector|embed|knowledge/.test(n)) return 'ai';
      if (/llm|\bai\b|openai|anthropic|gemini|groq|ollama|agent/.test(n)) return 'ai';
      if (/queue|worker|bull|bee|scheduler|redis/.test(n)) return 'infra';
      if (/db|database|store|storage|json|sqlite|postgres|mongo/.test(n)) return 'storage';
      if (/campaign|broadcast|blast/.test(n)) return 'campaign';
      if (/template/.test(n)) return 'template';
      if (/webhook/.test(n)) return 'integration';
      if (/payment|jazzcash|easypaisa|stripe|paypal/.test(n)) return 'payment';
      if (/portal|customer|supplier|dealer|staff/.test(n)) return 'portal';
      if (/auth|security|guard/.test(n)) return 'security';
      if (/audit|log|analytics/.test(n)) return 'observability';
      return 'core';
 }

  function scan() {
      const out = [];
      cfg.listDir('lib').forEach((name) => {
       const rel = 'lib/' + name;
       const dir = cfg.isDir(rel);
      out.push({ name, path: rel, exists: true, category: categorize(name), status: dir ? 'available_preview' :
  'file_preview', warnings: [] });
      });
      return out;
  }


  function moduleRegistry() {
    const modulesPreview = scan().map((m) => Object.assign(redactModule(m), { warnings: [] }));
      return cfg.base({ modulesPreview });
  }


  module.exports = { moduleRegistry, scan, categorize };
