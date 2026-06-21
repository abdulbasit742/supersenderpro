'use strict';


/**
 * No-Code Flows — campaign event timeline (PREVIEW). Builds a deterministic event
    * sequence for a campaign. No real events, no PII.
    */

const analytics = require('./campaignAnalytics');


function timeline(campaignId) {
     const a = analytics.analytics(campaignId);
     if (a.blockers && a.blockers.length) return { campaignId: campaignId, events: [], warnings: a.warnings, blockers:
a.blockers };
  const base = Date.now() - 6 * 3600 * 1000;
     function at(h) { return new Date(base + h * 3600 * 1000).toISOString(); }
     const events = [
       { at: at(0), type: 'campaign_created', detail: 'Campaign created (preview)' },
       { at: at(0.2), type: 'audience_resolved', detail: a.sentPreview + ' contacts (preview)' },
       { at: at(0.5), type: 'send_simulated', detail: a.sentPreview + ' messages would send (dry-run)' },
       { at: at(1), type: 'delivered', detail: a.deliveredPreview + ' delivered (preview)' },
       { at: at(2), type: 'replies', detail: a.repliesPreview + ' replies (preview)' },
       { at: at(3), type: 'clicks', detail: a.clicksPreview + ' clicks (preview)' },
       { at: at(4), type: 'conversions', detail: a.conversionsPreview + ' conversions (preview)' },
       { at: at(5), type: 'opt_outs', detail: a.optOutsPreview + ' opt-outs (preview)' },
     ];
     return { campaignId: campaignId, events: events, warnings: a.warnings, blockers: [], dryRun: true };
}

module.exports = { timeline };
