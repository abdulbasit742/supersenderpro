// lib/campaignIntelligence/replyAnalytics.js — read/reply aggregate preview.
  'use strict';
  const cfg = require('./config');
  const { loadCampaigns } = require('./moduleAdapters');
  const { deriveFunnel, rate } = require('./campaignModel');


  function readReplyAnalytics() {
    const camps = loadCampaigns();
    let delivered = 0, read = 0, replied = 0;
    (camps.length ? camps : [{}]).forEach((c) => { const f = deriveFunnel(c); delivered += f.deliveredPreview; read +=
  f.readPreview; replied += f.repliedPreview; });
    return cfg.base({ deliveredPreview: delivered, readPreview: read, repliedPreview: replied, readRatePreview: rate(read,
  delivered), replyRatePreview: rate(replied, read) });
  }
  module.exports = { readReplyAnalytics };
