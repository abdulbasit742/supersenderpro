'use strict';
/**
 * dedupe.js — CRM Feature #5: duplicate detection + profile merge.
 *
 * Real CRMs accumulate duplicates (same person, two phone formats; name typos). This finds likely
 * duplicates and merges them into one clean profile: union the timelines, recompute stats from the
 * combined history, and keep the best identity fields. Includes a dry-run preview so a human can
 * confirm before anything is changed.
 *
 * Decoupled from storage: you inject how to list/get/save/delete profiles, so this works against
 * Customer 360's JSON store today and Postgres later without changes.
 */

let store = {
  list: null,    // () => profiles[]
  get: null,     // (key) => profile
  save: null,    // (profile) => void
  remove: null   // (key) => void
};
function setStore(s = {}) { store = { ...store, ...s }; return store; }

function normPhone(v) { return String(v || '').replace(/[^\d]/g, ''); }
function normName(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Cheap string similarity (Dice coefficient on bigrams) -> 0..1.
function similarity(a, b) {
  a = normName(a); b = normName(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const ma = bigrams(a), mb = bigrams(b);
  let overlap = 0;
  for (const [g, c] of ma) if (mb.has(g)) overlap += Math.min(c, mb.get(g));
  const total = (a.length - 1) + (b.length - 1);
  return total > 0 ? (2 * overlap) / total : 0;
}

/**
 * Score how likely two profiles are the same person (0..1).
 * Phone match (last 10 digits) is the strongest signal; name/email similarity adds confidence.
 */
function duplicateScore(p1, p2) {
  const ph1 = normPhone(p1.phone).slice(-10);
  const ph2 = normPhone(p2.phone).slice(-10);
  if (ph1 && ph1 === ph2) return 1;
  let score = 0;
  if (p1.email && p2.email && p1.email.toLowerCase() === p2.email.toLowerCase()) score += 0.6;
  score += similarity(p1.name, p2.name) * 0.5;
  return Math.min(score, 0.99);
}

/** Find candidate duplicate pairs above a threshold. */
function findDuplicates(threshold = 0.7) {
  if (!store.list) throw new Error('no store wired (call setStore)');
  const profiles = store.list();
  const pairs = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const score = duplicateScore(profiles[i], profiles[j]);
      if (score >= threshold) {
        pairs.push({ a: profiles[i].key, b: profiles[j].key, score: Math.round(score * 100) / 100,
                     aName: profiles[i].name, bName: profiles[j].name });
      }
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

function maxIso(a, b) { if (!a) return b; if (!b) return a; return new Date(a) >= new Date(b) ? a : b; }
function minIso(a, b) { if (!a) return b; if (!b) return a; return new Date(a) <= new Date(b) ? a : b; }

// Build the merged profile object (does NOT persist). Primary wins on identity unless empty.
function buildMerged(primary, secondary) {
  const timeline = [...(primary.timeline || []), ...(secondary.timeline || [])]
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  // recompute stats from combined timeline
  const stats = { totalSpent: 0, orderCount: 0, messageCount: 0, firstOrderAt: null, lastOrderAt: null, lastMessageAt: null, lastContactAt: null };
  for (const ev of timeline) {
    if (ev.type === 'order') { stats.orderCount++; stats.firstOrderAt = minIso(stats.firstOrderAt, ev.at); stats.lastOrderAt = maxIso(stats.lastOrderAt, ev.at); }
    if ((ev.type === 'order' || ev.type === 'payment') && Number(ev.amount) > 0) stats.totalSpent += Number(ev.amount);
    if (ev.type === 'message') { stats.messageCount++; stats.lastMessageAt = maxIso(stats.lastMessageAt, ev.at); }
    stats.lastContactAt = maxIso(stats.lastContactAt, ev.at);
  }
  stats.totalSpent = Math.round(stats.totalSpent * 100) / 100;

  return {
    ...primary,
    name: primary.name || secondary.name,
    email: primary.email || secondary.email,
    tags: Array.from(new Set([...(primary.tags || []), ...(secondary.tags || [])])),
    stage: primary.stage && primary.stage !== 'lead' ? primary.stage : secondary.stage,
    timeline,
    stats,
    mergedFrom: [...(primary.mergedFrom || []), secondary.key],
    updatedAt: new Date().toISOString()
  };
}

/** Preview a merge without changing anything. */
function previewMerge(primaryKey, secondaryKey) {
  if (!store.get) throw new Error('no store wired (call setStore)');
  const primary = store.get(primaryKey);
  const secondary = store.get(secondaryKey);
  if (!primary || !secondary) return { ok: false, error: 'both profiles must exist' };
  const merged = buildMerged(primary, secondary);
  return { ok: true, preview: { key: merged.key, name: merged.name, stats: merged.stats, timelineEvents: merged.timeline.length, mergedFrom: merged.mergedFrom } };
}

/** Merge secondary INTO primary, persist, and remove the secondary. */
function merge(primaryKey, secondaryKey) {
  if (!store.get || !store.save || !store.remove) throw new Error('store needs get/save/remove');
  if (primaryKey === secondaryKey) throw new Error('cannot merge a profile into itself');
  const primary = store.get(primaryKey);
  const secondary = store.get(secondaryKey);
  if (!primary || !secondary) return { ok: false, error: 'both profiles must exist' };
  const merged = buildMerged(primary, secondary);
  store.save(merged);
  store.remove(secondaryKey);
  return { ok: true, merged: { key: merged.key, mergedFrom: merged.mergedFrom, stats: merged.stats } };
}

module.exports = { setStore, similarity, duplicateScore, findDuplicates, previewMerge, merge };
