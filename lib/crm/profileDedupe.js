'use strict';
/**
 * profileDedupe.js — CRM Feature #5: duplicate detection + merge.
 *
 * Customers sneak in twice (different phone format, typo, email-only vs phone-only). Duplicates wreck
 * stats and segments. This finds likely duplicates and merges them cleanly: timelines are unioned
 * (deduped + sorted), tags combined, the strongest identity kept, and stats recomputed.
 *
 * Storage-agnostic: pass in how to load/save the profile store and how to recompute stats so this
 * reuses Customer 360's own logic instead of duplicating it.
 */

function normPhone(v) { return String(v || '').replace(/[^\d]/g, ''); }
function normName(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Cheap name similarity (token overlap). Good enough to flag review candidates.
function nameSimilarity(a, b) {
  const ta = new Set(normName(a).split(' ').filter(Boolean));
  const tb = new Set(normName(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.max(ta.size, tb.size);
}

/**
 * Find duplicate clusters among profiles.
 * @param {Array} profiles  list of Customer 360 profiles
 * @returns {Array} clusters: [{ reason, keys:[...] }]
 */
function findDuplicates(profiles) {
  const clusters = [];
  const byPhone = {};
  const byEmail = {};

  for (const p of profiles) {
    const ph = normPhone(p.phone || p.key);
    if (ph) (byPhone[ph] = byPhone[ph] || []).push(p.key);
    const em = String(p.email || '').trim().toLowerCase();
    if (em) (byEmail[em] = byEmail[em] || []).push(p.key);
  }

  for (const [ph, keys] of Object.entries(byPhone)) {
    if (keys.length > 1) clusters.push({ reason: `same phone ${ph}`, keys: Array.from(new Set(keys)) });
  }
  for (const [em, keys] of Object.entries(byEmail)) {
    if (keys.length > 1) clusters.push({ reason: `same email ${em}`, keys: Array.from(new Set(keys)) });
  }

  // fuzzy name (only flag, never auto-merge): O(n^2) but fine for review batches
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const sim = nameSimilarity(profiles[i].name, profiles[j].name);
      if (sim >= 0.8 && profiles[i].name) {
        clusters.push({ reason: `similar name (${Math.round(sim * 100)}%)`, keys: [profiles[i].key, profiles[j].key], review: true });
      }
    }
  }
  return clusters;
}

function tlSignature(ev) { return `${ev.type}|${ev.at}|${ev.amount ?? ''}|${ev.ref ?? ''}`; }

/**
 * Merge `loserKey` into `winnerKey`. Mutates and persists via injected store.
 * @param {Object} store { load, save, recompute }  (recompute(profile) recalculates stats)
 */
function mergeProfiles(store, winnerKey, loserKey) {
  if (winnerKey === loserKey) throw new Error('cannot merge a profile into itself');
  const data = store.load();
  const winner = data.profiles[winnerKey];
  const loser = data.profiles[loserKey];
  if (!winner || !loser) throw new Error('both profiles must exist');

  // union timelines, dedupe by signature, sort chronologically
  const seen = new Set();
  const merged = [];
  for (const ev of [...(winner.timeline || []), ...(loser.timeline || [])]) {
    const sig = tlSignature(ev);
    if (seen.has(sig)) continue;
    seen.add(sig);
    merged.push(ev);
  }
  merged.sort((a, b) => new Date(a.at) - new Date(b.at));
  winner.timeline = merged.slice(-2000);

  // combine identity: keep winner's, fill gaps from loser
  winner.name = winner.name || loser.name;
  winner.email = winner.email || loser.email;
  winner.tags = Array.from(new Set([...(winner.tags || []), ...(loser.tags || [])]));
  if (loser.stage === 'customer') winner.stage = 'customer';
  winner.optedIn = winner.optedIn && loser.optedIn;
  winner.mergedFrom = Array.from(new Set([...(winner.mergedFrom || []), loserKey]));
  winner.updatedAt = new Date().toISOString();

  if (typeof store.recompute === 'function') store.recompute(winner);
  delete data.profiles[loserKey];
  store.save(data);
  return winner;
}

module.exports = { findDuplicates, mergeProfiles, nameSimilarity };
