// lib/campaignIntelligence/rateLimitRiskPreview.js — spam/rate-limit risk + safe batch plan preview.
  'use strict';
  const cfg = require('./config');


  function rateLimitRisk(input) {
      const i = input || {};
      const audience = Math.max(0, Number(i.audienceCount) || 0);
      const perMinute = Math.max(1, Number(i.perMinute) || 20);
      const batches = Math.ceil(audience / perMinute);
      const level = audience > 5000 ? 'high_preview' : audience > 1000 ? 'medium_preview' : 'low_preview';
      return cfg.base({
        liveSend: false, rateLimitRiskPreview: level,
        safeBatchPlanPreview: { audiencePreview: audience, perMinutePreview: perMinute, batchesPreview: batches,
  estimatedMinutesPreview: batches },
      recommendationsPreview: level === 'high_preview' ? ['Split into smaller batches across multiple days.'] : [],
      });
  }
  module.exports = { rateLimitRisk };
