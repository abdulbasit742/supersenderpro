// lib/campaignIntelligence/conversionAnalytics.js — click/conversion aggregate preview.
  'use strict';
  const cfg = require('./config');
  const { loadCampaigns } = require('./moduleAdapters');
  const { deriveFunnel, rate } = require('./campaignModel');


  function conversionAnalytics() {
    const camps = loadCampaigns();
    let read = 0, clicked = 0, converted = 0;
    (camps.length ? camps : [{}]).forEach((c) => { const f = deriveFunnel(c); read += f.readPreview; clicked +=
  f.clickedPreview; converted += f.convertedPreview; });
    return cfg.base({ readPreview: read, clickedPreview: clicked, convertedPreview: converted, clickRatePreview:
  rate(clicked, read), conversionRatePreview: rate(converted, read) });
  }
  module.exports = { conversionAnalytics };
