'use strict';
const cfg=require('./config'); const { maskMessage }=require('./redactor');
function sampleSize(metric){ return metric==='conversion_rate_preview'?1200:600; }
function abTestDesign(input){ const i=input||{}; const metric=i.successMetric||'reply_rate_preview'; return cfg.base({ liveCampaignMutation:false, liveSend:false, abTestDraftPreview:{ testNamePreview:i.name?'A/B Test '+String(i.name).slice(-4):'A/B Test ****', variantAPreview:{ messagePreview:maskMessage(i.variantA||'Variant A copy preview'), ctaPreview:i.ctaA||'Reply YES' }, variantBPreview:{ messagePreview:maskMessage(i.variantB||'Variant B copy preview'), ctaPreview:i.ctaB||'Tap to order' }, sampleSizePreview:sampleSize(metric), successMetricPreview:metric } }); }
module.exports={ abTestDesign, sampleSize };
