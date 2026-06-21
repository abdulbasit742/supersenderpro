 'use strict';
 const b = require('./_base');
 // Reads WhatsApp Cloud Setup config inspector if present; else checks Baileys/session hints.
 function health() {
   const cloud = b.anyExists(['lib/whatsappCloudSetup/configInspector.js']);
     const baileys = b.anyExists(['data/baileys', 'sessions', 'auth_info_baileys']);
     if (!cloud && !baileys) return b.unavailable('WhatsApp');
     let status = 'healthy', summary = 'WhatsApp lane present';
     if (cloud) {
      try {
        const insp = require(process.cwd() + '/lib/whatsappCloudSetup/configInspector.js');
        const cfg = insp.inspectConfig();

     if (cfg.enabled && cfg.missing.length) { status = 'degraded'; summary = 'Cloud API enabled but missing ' +
cfg.missing.length + ' config value(s)'; }
     else if (!cfg.enabled && !baileys) { status = 'warning'; summary = 'Cloud API disabled and no local session detected'; }
   } catch (e) { status = 'unknown'; summary = 'WhatsApp config could not be read safely'; }
 }
 return b.record(status, summary, { category: 'whatsapp', affectedFiles: ['lib/whatsappCloudSetup/configInspector.js'],
recommendedFix: 'Open WhatsApp Cloud Setup wizard to complete config.' });
}
module.exports = { health };
