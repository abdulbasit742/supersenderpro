// lib/attribution/index.js
// Orchestrator: take all conversion journeys, run every attribution model, and
// roll the credited revenue up by channel and by campaign. The output lets you
// compare "last-touch says WhatsApp gets everything" vs "first-touch says
// Instagram started it" vs the balanced multi-touch models — side by side.

const journeys = require('./journeys');
const { MODELS, weightsFor } = require('./models');

function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function emptyBucket() { return { revenue: 0, conversions: 0 }; }

// Credit one journey under one model into channel + campaign accumulators.
function creditJourney(journey, model, byChannel, byCampaign) {
  const times = journey.touches.map((t) => t.ts);
  const weights = weightsFor(model, times, journey.convTime);
  journey.touches.forEach((t, i) => {
    const credit = journey.value * (weights[i] || 0);
    if (credit <= 0) return;
    const ch = t.channel || 'unknown';
    if (!byChannel[ch]) byChannel[ch] = emptyBucket();
    byChannel[ch].revenue += credit;
    // Count a conversion for the channel that holds the converting (last) touch.
    if (i === journey.touches.length - 1) byChannel[ch].conversions += 1;

    if (t.campaign) {
      if (!byCampaign[t.campaign]) byCampaign[t.campaign] = emptyBucket();
      byCampaign[t.campaign].revenue += credit;
      if (i === journey.touches.length - 1) byCampaign[t.campaign].conversions += 1;
    }
  });
}

function bucketsToSortedArray(buckets, keyName) {
  return Object.entries(buckets)
    .map(([k, v]) => ({ [keyName]: k, revenue: round(v.revenue), conversions: v.conversions }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildSnapshot(storeId = 'default_store', now = Date.now()) {
  const js = journeys.allJourneys(storeId, now);
  const totalRevenue = round(js.reduce((s, j) => s + j.value, 0));
  const multiTouchShare = js.length
    ? round((js.filter((j) => j.touches.length > 1).length / js.length) * 100)
    : 0;

  const models = {};
  for (const model of MODELS) {
    const byChannel = {};
    const byCampaign = {};
    for (const j of js) creditJourney(j, model, byChannel, byCampaign);
    models[model] = {
      byChannel: bucketsToSortedArray(byChannel, 'channel'),
      byCampaign: bucketsToSortedArray(byCampaign, 'campaign'),
    };
  }

  // Cross-model channel comparison table: channel -> { model: revenue }.
  const channels = new Set();
  for (const m of MODELS) models[m].byChannel.forEach((r) => channels.add(r.channel));
  const comparison = Array.from(channels).map((channel) => {
    const row = { channel };
    for (const m of MODELS) {
      const found = models[m].byChannel.find((r) => r.channel === channel);
      row[m] = found ? found.revenue : 0;
    }
    return row;
  }).sort((a, b) => (b.last_touch || 0) - (a.last_touch || 0));

  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    lookbackDays: journeys.LOOKBACK_DAYS,
    summary: {
      conversions: js.length,
      totalRevenue,
      avgTouchesPerConversion: js.length ? round(js.reduce((s, j) => s + j.touches.length, 0) / js.length) : 0,
      multiTouchSharePct: multiTouchShare,
    },
    models,
    comparison,
  };
}

function buildAllSnapshot(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch { /* default */ }
  const stores = ids.map((id) => buildSnapshot(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot, MODELS };
