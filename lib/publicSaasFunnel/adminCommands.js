// lib/publicSaasFunnel/adminCommands.js
// Admin WhatsApp command handlers for the public funnel.
// Integration point only — returns concise text replies. Does NOT create a new bot.
// Wire these into the existing admin command router; no duplicate bot is started here.

const leadStore = require('./leadStore');
const demoRequests = require('./demoRequests');
const trialRequests = require('./trialRequests');
const followups = require('./leadFollowupDrafts');
const kpiAdapter = require('./adapters/kpiCommandAdapter');
const { config } = require('./store');

const COMMANDS = ['!leads', '!hotleads', '!demos', '!trials', '!lead', '!followupdraft', '!funnelstatus', '!funnelkpi', '!pricinglink', '!startlink'];

function baseUrl() {
  return process.env.SOCIAL_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || '';
}

// Parse a command string and return a concise reply (Urdu/English mixed).
function handle(text) {
  const raw = String(text || '').trim();
  const [cmd, ...args] = raw.split(/\s+/);
  const c = (cmd || '').toLowerCase();

  switch (c) {
    case '!leads': {
      const n = leadStore.counts();
      return `📋 Leads: ${n.total} | Qualified: ${n.qualifiedLeads} | Hot: ${n.highScoreLeads}`;
    }
    case '!hotleads': {
      const hot = leadStore.list({ grade: 'hot' }).concat(leadStore.list({ grade: 'priority' })).slice(0, 10);
      if (!hot.length) return 'Koi hot lead nahi mila abhi.';
      return '🔥 Hot Leads:\n' + hot.map((l) => `• ${l.nameSafe} (${l.businessType}) — ${l.score}`).join('\n');
    }
    case '!demos': {
      const d = demoRequests.counts();
      return `🗓️ Demo Requests: ${d.total} | ${JSON.stringify(d.byStatus)}`;
    }
    case '!trials': {
      const t = trialRequests.counts();
      return `🚀 Trial Requests: ${t.total} | ${JSON.stringify(t.byStatus)}`;
    }
    case '!lead': {
      const lead = leadStore.get(args[0]);
      if (!lead) return 'Lead nahi mila. Usage: !lead [id]';
      return `Lead ${lead.id}\nName: ${lead.nameSafe}\nType: ${lead.businessType}\nPlan: ${lead.interestedPlan || '-'}\nScore: ${lead.score} (${lead.grade})\nStatus: ${lead.status}\nNext: ${lead.nextAction}`;
    }
    case '!followupdraft': {
      const lead = leadStore.get(args[0]);
      if (!lead) return 'Lead nahi mila. Usage: !followupdraft [leadId]';
      const d = followups.generate(lead, 'whatsapp');
      return d.blocked ? `⚠️ ${d.adminReviewNote}` : `📝 Draft (review & send manually):\n${d.draft}`;
    }
    case '!funnelstatus': {
      return `Funnel: ${config.enabled ? 'ON' : 'OFF'} | DryRun: ${config.dryRun ? 'ON' : 'OFF'} | Consent: ${config.requireConsent ? 'required' : 'off'}`;
    }
    case '!funnelkpi': {
      const k = kpiAdapter.buildKpis({ leads: leadStore._all(), demoRequests: demoRequests._all(), trialRequests: trialRequests._all() });
      return `📊 Leads: ${k.totalLeads} | Demos: ${k.demoRequests} | Trials: ${k.trialRequests} | Conv: ${k.requestConversionRatePct}%`;
    }
    case '!pricinglink': return `Pricing: ${baseUrl()}/pricing.html`;
    case '!startlink': return `Start Setup: ${baseUrl()}/start.html`;
    default:
      return `Unknown command. Try: ${COMMANDS.join(' ')}`;
  }
}

module.exports = { handle, COMMANDS };
