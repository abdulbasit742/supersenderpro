// lib/campaignIntelligence/templatePerformancePreview.js — template performance preview from data or synthetic.
 'use strict';
 const cfg = require('./config');
 const { seeded } = require('./config');
 const { redactTemplate } = require('./redactor');


 function loadTemplates() {
   const data = cfg.readJSON('data/templates.json') || { templates: [] };
   const arr = Array.isArray(data) ? data : (data.templates || []);
   if (arr.length) return arr;
   return ['welcome', 'payment_reminder', 'order_update', 'winback', 'promo'].map((n) => ({ name: n, category: 'utility'
 }));
 }


 function templatePerformance() {
   const templatesPreview = loadTemplates().map((t) => {
     const rnd = seeded('tpl:' + (t.name || 'x'));
     const readRate = Number((0.5 + rnd() * 0.45).toFixed(3));
     const replyRate = Number((0.05 + rnd() * 0.35).toFixed(3));
     return Object.assign(redactTemplate(t), { readRatePreview: readRate, replyRatePreview: replyRate, scorePreview:
 Math.round((readRate * 0.4 + replyRate * 0.6) * 100) });
   });

   const sorted = templatesPreview.slice().sort((a, b) => b.scorePreview - a.scorePreview);
   return cfg.base({ templatesPreview, bestTemplatePreview: sorted[0] || null, weakTemplatePreview: sorted[sorted.length -
 1] || null, qualityRiskPreview: 'low_preview' });
 }
 module.exports = { templatePerformance, loadTemplates };
