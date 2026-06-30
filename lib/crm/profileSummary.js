'use strict';
/**
 * profileSummary.js — CRM Feature #4: an AI-written brief of a customer.
 *
 * Turns a Customer 360 profile (#1) + pipeline/notes into a few human sentences a rep can read in 3
 * seconds before they call: who this is, how valuable, any risk, and the single next best action.
 *
 * AI is INJECTED (setAiBrain) so this routes through SuperSender's existing llmHub — i.e. the
 * self-hosted Ollama box (qwen2.5:32b) by default, cloud only as fallback. If no brain is wired or it
 * fails, a deterministic template summary is returned so the feature never hard-fails.
 *
 * No storage of its own — it reads the 360 profile passed in.
 */

// Injected: async (prompt:string) => string
let aiBrain = null;
function setAiBrain(fn) { aiBrain = typeof fn === 'function' ? fn : null; }

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// Compact, recent slice of the timeline so the prompt stays small/cheap for the local model.
function recentTimeline(profile, n = 8) {
  const items = Array.isArray(profile.timeline) ? profile.timeline.slice(-n) : [];
  return items.map(e => {
    const when = e.at ? new Date(e.at).toISOString().slice(0, 10) : '';
    if (e.type === 'order' || e.type === 'payment') return `${when} ${e.type} ${e.amount != null ? e.amount : ''}`.trim();
    if (e.type === 'message') return `${when} message: ${(e.text || '').slice(0, 60)}`;
    if (e.type === 'note') return `${when} note: ${(e.text || '').slice(0, 60)}`;
    if (e.type === 'stage') return `${when} ${e.text || 'stage change'}`;
    return `${when} ${e.type}`;
  });
}

function buildPrompt(profile) {
  const s = profile.stats || {};
  const lines = [
    'You are a CRM assistant. Write a 3-sentence brief for a sales rep about to contact this customer.',
    'Be specific and practical. End with one clear "Next best action:".',
    '',
    `Name: ${profile.name || 'Unknown'}`,
    `Stage: ${profile.stage || 'lead'}`,
    `Tags: ${(profile.tags || []).join(', ') || 'none'}`,
    `Total spent: ${s.totalSpent || 0}`,
    `Orders: ${s.orderCount || 0}`,
    `Last order: ${s.lastOrderAt ? `${daysSince(s.lastOrderAt)} days ago` : 'never'}`,
    `Last contact: ${s.lastContactAt ? `${daysSince(s.lastContactAt)} days ago` : 'never'}`,
    `Opted in: ${profile.optedIn !== false}`,
    '',
    'Recent activity:',
    ...recentTimeline(profile)
  ];
  return lines.join('\n');
}

// Deterministic fallback so the feature works even with no AI available.
function templateSummary(profile) {
  const s = profile.stats || {};
  const lastOrder = s.lastOrderAt ? `${daysSince(s.lastOrderAt)} days ago` : 'never ordered';
  const value = (s.totalSpent || 0) > 0 ? `has spent ${s.totalSpent} across ${s.orderCount} order(s)` : 'has not purchased yet';
  let action;
  if ((s.orderCount || 0) === 0) action = 'Send a first-purchase offer.';
  else if (daysSince(s.lastOrderAt) > 60) action = 'Win-back: re-engage with a returning-customer offer.';
  else action = 'Upsell a complementary product.';
  return `${profile.name || 'This customer'} is at the "${profile.stage || 'lead'}" stage and ${value} (last order: ${lastOrder}). ` +
         `Engagement: last contact ${s.lastContactAt ? `${daysSince(s.lastContactAt)} days ago` : 'unknown'}. ` +
         `Next best action: ${action}`;
}

/**
 * Produce a brief for a profile. Uses the injected AI brain if available, else the template.
 * @returns {Promise<{ summary:string, source:'ai'|'template' }>}
 */
async function summarize(profile) {
  if (!profile) throw new Error('profile is required');
  if (aiBrain) {
    try {
      const out = await aiBrain(buildPrompt(profile));
      const text = String(out || '').trim();
      if (text) return { summary: text, source: 'ai' };
    } catch (e) {
      // fall through to template
    }
  }
  return { summary: templateSummary(profile), source: 'template' };
}

module.exports = { setAiBrain, summarize, buildPrompt };
