'use strict';


/**
    * No-Code Flows — campaign analytics (PREVIEW values only). Reads a local campaigns
    * store if present; otherwise returns deterministic demo preview metrics. No real
    * sends, no external calls, no real customer data.
    */


const fs = require('fs');
const path = require('path');


const CAMPAIGNS_PATH = process.env.NO_CODE_FLOWS_CAMPAIGNS_PATH || 'data/no-code-campaigns.json';

function readCampaigns() {
  try { const p = path.join(process.cwd(), CAMPAIGNS_PATH); if (fs.existsSync(p)) { const d =
JSON.parse(fs.readFileSync(p, 'utf8')); if (Array.isArray(d.campaigns)) return d.campaigns; } }
  catch (e) { /* fall through */ }
     // Deterministic demo campaigns (preview only).
     return [
       { campaignId: 'DEMO-CAMP-001', name: 'Welcome series (demo)', audience: 500 },
       { campaignId: 'DEMO-CAMP-002', name: 'Abandoned cart (demo)', audience: 220 },
       { campaignId: 'DEMO-CAMP-003', name: 'Renewal reminder (demo)', audience: 140 },
     ];
}

function list() { return readCampaigns().map(function (c) { return { campaignId: c.campaignId, name: c.name, audience:
c.audience || 0 }; }); }

// Deterministic preview funnel from audience size (no randomness, no real data).
function analytics(campaignId) {
  const c = readCampaigns().find(function (x) { return x.campaignId === campaignId; });
  if (!c) return { campaignId: campaignId, warnings: ['campaign not found; preview only'], blockers: [], sentPreview: 0,
deliveredPreview: 0, repliesPreview: 0, clicksPreview: 0, conversionsPreview: 0, optOutsPreview: 0, revenuePreview: 0 };
     const a = c.audience || 0;
     const sent = a;
     const delivered = Math.round(a * 0.96);
     const replies = Math.round(delivered * 0.18);
     const clicks = Math.round(delivered * 0.22);
     const conversions = Math.round(clicks * 0.25);
     const optOuts = Math.round(delivered * 0.012);
     const revenue = conversions * 1500; // demo PKR per conversion
     const warnings = ['Preview values only. No real campaign was sent.'];
     const blockers = [];
     if (optOuts / Math.max(1, delivered) > 0.02) warnings.push('Opt-out rate above 2% (preview).');
     return {

       campaignId: campaignId,
       sentPreview: sent, deliveredPreview: delivered, repliesPreview: replies, clicksPreview: clicks,
       conversionsPreview: conversions, optOutsPreview: optOuts, revenuePreview: revenue,
       funnel: { sent: sent, delivered: delivered, replied: replies, clicked: clicks, converted: conversions },
       rates: { deliveryRate: pct(delivered, sent), replyRate: pct(replies, delivered), clickRate: pct(clicks, delivered),
conversionRate: pct(conversions, delivered), optOutRate: pct(optOuts, delivered) },
    warnings: warnings, blockers: blockers, dryRun: true,
     };
}

function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }

module.exports = { list, analytics };
