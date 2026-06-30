'use strict';

/**
 * Ecommerce Hub — loyalty tiers on top of loyalty points.
 * Maps a buyer's lifetime orders/points to a tier (Bronze/Silver/Gold/Platinum)
 * with perks text. Tiers configurable via LOYALTY_TIERS env JSON. Read-only.
 */

const loyalty = require('./loyalty');

function tiers() {
  try { const t = JSON.parse(process.env.LOYALTY_TIERS || ''); if (Array.isArray(t)) return t; } catch (_e) {}
  return [
    { name: 'Bronze', minPoints: 0, perk: 'Welcome! Har order pe points.' },
    { name: 'Silver', minPoints: 500, perk: '5% extra points + priority support.' },
    { name: 'Gold', minPoints: 2000, perk: '10% extra points + free delivery occasionally.' },
    { name: 'Platinum', minPoints: 5000, perk: 'Best perks: early sales + free delivery.' }
  ];
}

function tierFor(phone) {
  const pts = loyalty.balance(phone);
  const list = tiers().slice().sort(function (a, b) { return a.minPoints - b.minPoints; });
  let cur = list[0];
  for (const t of list) { if (pts >= t.minPoints) cur = t; }
  const next = list.find(function (t) { return t.minPoints > pts; });
  return { points: pts, tier: cur, next: next || null };
}
function reply(phone) {
  const r = tierFor(phone);
  let out = '\ud83c\udfc5 *Aapka tier: ' + r.tier.name + '*\nPoints: ' + r.points + '\n' + r.tier.perk;
  if (r.next) out += '\n\n' + (r.next.minPoints - r.points) + ' points aur, phir *' + r.next.name + '*!';
  return out;
}

module.exports = { tiers, tierFor, reply };
