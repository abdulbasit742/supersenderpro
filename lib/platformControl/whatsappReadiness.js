// lib/platformControl/whatsappReadiness.js — local/Baileys readiness, presence only, live send OFF.
 'use strict';
 const cfg = require('./config');


 function whatsappReadiness() {
     const keys = cfg.envKeyNames();
     return cfg.base({
       liveSendEnabled: false,
       baileysReadyPreview: cfg.hasFile([/baileys/i, /whatsapp.*(local|web|session)/i]) || cfg.exists('lib/whatsapp'),
       cloudApiReadyPreview: keys.includes('META_ACCESS_TOKEN') || cfg.hasFile([/cloud.*api/i, /whatsappcloud/i]),
       webhookReadyPreview: cfg.hasFile([/webhook/i]),
       templatesReadyPreview: cfg.hasFile([/template/i]),
     });
 }


 module.exports = { whatsappReadiness };
