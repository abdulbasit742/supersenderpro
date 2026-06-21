// lib/platformControl/cloudApiReadiness.js — WhatsApp Cloud API readiness, presence only.
 'use strict';
 const cfg = require('./config');

 function cloudApiReadiness() {
     const keys = cfg.envKeyNames();
     const tokenPresent = keys.includes('META_ACCESS_TOKEN') || keys.includes('WHATSAPP_CLOUD_TOKEN');
     const filesPresent = cfg.hasFile([/cloud/i, /meta/i, /graph.*api/i]);
     return cfg.base({
       liveSendEnabled: false,
       cloudApiFilesPresentPreview: filesPresent,
       accessTokenPresentPreview: tokenPresent,
       phoneNumberIdPresentPreview: keys.includes('META_PHONE_NUMBER_ID') || keys.includes('WHATSAPP_PHONE_ID'),
       verifyTokenPresentPreview: keys.includes('META_VERIFY_TOKEN') || keys.includes('WEBHOOK_VERIFY_TOKEN'),
       readyPreview: filesPresent && tokenPresent,
     });
 }


 module.exports = { cloudApiReadiness };
