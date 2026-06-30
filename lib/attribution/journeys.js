// lib/attribution/journeys.js
// Reconstructs per-customer journeys from the CRM interaction log, then splits
// them into conversion journeys: the ordered sequence of touchpoints leading up
// to each order. A touchpoint = a contact event tagged with a channel and
// (optionally) a campaign, so credit can later roll up by either dimension.
//
// Reads storeCRM only. If a customer has orders but no preceding touches, we
// synthesise a single touch from their acquisition `source` so revenue is never
// silently dropped.

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

const LOOKBACK_DAYS = Number(process.env.ATTRIBUTION_LOOKBACK_DAYS || 90);
const DAY = 86400000;

// Which interaction types count as a marketing "touch" (vs the order itself).
const TOUCH_TYPES = new Set([
  'inbound', 'reply', 'message_in', 'message_out',
  'broadcast', 'campaign', 'loyalty_earn', 'loyalty_redeem',
  'follow_up', 're_engagement', 'note',
]);

function channelOf(interaction, customer) {
  return (
    interaction.channel ||
    interaction.source ||
    (interaction.kind === 're_engagement' ? 're_engagement' : null) ||
    (customer && customer.source) ||
    'whatsapp'
  );
}

function campaignOf(interaction) {
  return interaction.campaignId || interaction.campaign || interaction.experimentId || null;
}

// Build conversion journeys for one customer.
function customerJourneys(storeId, phone, now) {
  if (!storeCRM) return [];
  const customer = storeCRM.getCustomer(storeId, phone) || {};
  const interactions = (storeCRM.getCustomerInteractions(storeId, phone, 500) || [])
    .slice()
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()); // oldest first

  const minTs = now - LOOKBACK_DAYS * DAY;
  const orders = interactions.filter((i) => i.type === 'order' && Number(i.amount) > 0 && new Date(i.ts).getTime() >= minTs);
  if (!orders.length) return [];

  const journeys = [];
  for (const order of orders) {
    const convTime = new Date(order.ts).getTime();
    const windowStart = convTime - LOOKBACK_DAYS * DAY;
    // Touches strictly before the order, within the lookback window.
    let touches = interactions
      .filter((i) => {
        const t = new Date(i.ts).getTime();
        return t <= convTime && t >= windowStart && (TOUCH_TYPES.has(i.type) || i.type === 'order');
      })
      .map((i) => ({
        ts: new Date(i.ts).getTime(),
        channel: channelOf(i, customer),
        campaign: campaignOf(i),
        type: i.type,
      }));

    // De-dup consecutive identical (channel,campaign) touches so a burst of
    // messages on one channel doesn't dominate the linear model.
    touches = touches.filter((t, idx, arr) => {
      if (idx === 0) return true;
      const p = arr[idx - 1];
      return !(p.channel === t.channel && p.campaign === t.campaign);
    });

    if (!touches.length) {
      touches = [{ ts: convTime, channel: customer.source || 'whatsapp', campaign: null, type: 'order' }];
    }

    journeys.push({ phone, convTime, value: Number(order.amount || 0), touches });
  }
  return journeys;
}

function allJourneys(storeId, now = Date.now()) {
  if (!storeCRM) return [];
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const out = [];
  for (const c of customers) {
    if (!c.phone) continue;
    for (const j of customerJourneys(storeId, c.phone, now)) out.push(j);
  }
  return out;
}

module.exports = { allJourneys, customerJourneys, LOOKBACK_DAYS, TOUCH_TYPES };
