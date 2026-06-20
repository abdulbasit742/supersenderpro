// lib/publicSaasFunnel/adapters/growthCampaignAdapter.js
// Safe adapter over the existing Growth Campaign Center.
// Provides lead source attribution + audience DRAFTS for opted-in leads only. No live campaigns.

const complianceAdapter = require('../complianceAdapter');

let growthPresent = false;
try { require.resolve('../../../routes/growth'); growthPresent = true; } catch { growthPresent = false; }

// Build a campaign audience draft containing ONLY marketing-consented leads.
function audienceDraft(leads) {
  const list = Array.isArray(leads) ? leads : [];
  const optedIn = list.filter((l) => {
    const c = complianceAdapter.checkConsent(l);
    return c.canMarket && !c.suppressed;
  });
  return {
    type: 'growth_campaign_audience_draft',
    growthCampaignDetected: growthPresent,
    totalCandidates: list.length,
    optedInCount: optedIn.length,
    audience: optedIn.map((l) => ({ id: l.id, businessType: l.businessType, score: l.score })),
    liveCampaign: false,
    note: 'DRAFT audience only (opted-in leads). No live campaign created.',
    createdAt: new Date().toISOString(),
  };
}

function sourceAttribution(leads) {
  const list = Array.isArray(leads) ? leads : [];
  const bySource = {};
  for (const l of list) {
    const s = l.sourcePage || 'unknown';
    bySource[s] = (bySource[s] || 0) + 1;
  }
  return { type: 'lead_source_attribution', bySource, total: list.length };
}

module.exports = { present: growthPresent, audienceDraft, sourceAttribution };
