// lib/workflowOrchestrator/moduleAdapters.js — detect existing modules; never load/execute them.
 'use strict';
 const cfg = require('./config');


 const ADAPTERS = [
      { key: 'whatsapp', file: /baileys|whatsapp(?!cloud)/i }, { key: 'whatsappCloud', file: /cloud|meta|graph/i },
      { key: 'campaigns', file: /campaign|broadcast/i }, { key: 'templates', file: /template/i },
      { key: 'contacts', file: /contact|customer/i }, { key: 'crm', file: /crm/i },
      { key: 'ecommerce', file: /ecommerce|order|cart|shop/i }, { key: 'invoices', file:
 /invoice|payment|jazz|easypaisa|stripe/i },
   { key: 'ai', file: /llm|\bai\b|openai|anthropic|gemini|groq|ollama/i }, { key: 'rag', file: /rag|vector|embed/i },
      { key: 'customerPortal', file: /customer.*portal|portal.*customer/i }, { key: 'supplierPortal', file: /supplier/i },
      { key: 'staffPortal', file: /staff/i }, { key: 'dealerPortal', file: /dealer|reseller/i },
      { key: 'platformControl', file: /platformcontrol|platform-control/i }, { key: 'analytics', file: /analytics/i },
      { key: 'audit', file: /audit|log/i }, { key: 'queue', file: /queue|worker|bull|bee/i },
 ];


 function detect() {
   const out = {}; const warnings = [];
      ADAPTERS.forEach((a) => {
        const available = cfg.hasFile([a.file]);
       out[a.key] = { availablePreview: available, livePreview: false };
       if (!available) warnings.push(a.key + ': module_not_available');
      });
      return { adapters: out, warnings };
 }


 // Safe empty preview for a missing module.
 function emptyPreview(moduleKey) { return { availablePreview: false, dataPreview: null, warning: 'module_not_available',
 moduleKey }; }


 module.exports = { detect, emptyPreview, ADAPTERS };
