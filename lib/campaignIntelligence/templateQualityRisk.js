// lib/campaignIntelligence/templateQualityRisk.js — WhatsApp template quality risk preview (heuristic).
 'use strict';
 const cfg = require('./config');
 const { loadTemplates } = require('./templatePerformancePreview');
 const { redactTemplate } = require('./redactor');


 const SPAMMY = /free|winner|click here|urgent|congratulations|100%|guarantee|cash|loan/i;

 function templateQualityRisk() {
   const risksPreview = loadTemplates().map((t) => {
     const body = String(t.body || t.name || '');
     const signals = [];
     if (SPAMMY.test(body)) signals.push('spammy_wording');
     if (body.length > 1024) signals.push('too_long');
     if ((body.match(/[A-Z]{4,}/g) || []).length > 2) signals.push('excess_caps');
     const level = signals.length >= 2 ? 'high_preview' : signals.length === 1 ? 'medium_preview' : 'low_preview';
     return Object.assign(redactTemplate(t), { riskLevelPreview: level, signalsPreview: signals });
   });
   const highCount = risksPreview.filter((r) => r.riskLevelPreview === 'high_preview').length;
   return cfg.base({ risksPreview, overallRiskPreview: highCount > 0 ? 'elevated_preview' : 'low_preview' });
 }
 module.exports = { templateQualityRisk };
