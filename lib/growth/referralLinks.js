'use strict';
/**
 * referralLinks.js — Growth Feature #1: shareable referral links + attribution.
 *
 * Loyalty (#marketing4) already gives each customer a referral CODE and rewards conversions. This
 * adds the SHARE side: a clean per-customer link they can post anywhere (click-to-WhatsApp or a
 * landing URL) that carries their code, plus click + signup tracking and a referrer leaderboard. The
 * viral loop: customer shares link -> friend clicks -> lands in WhatsApp with the code -> converts ->
 * both rewarded (loyalty).
 *
 * Storage: JSON (data/referral_links.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'referral_links.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { links: [], clicks: [] }; }
  catch { return { links: [], clicks: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
const slug = () => Math.random().toString(36).slice(2, 8);

/**
 * Create (or fetch existing) a share link for a referrer.
 * @param {Object} opts { referrerPhone, code, businessWaNumber?, baseUrl?, prefillText? }
 */
function createLink(opts = {}) {
  const referrerPhone = normPhone(opts.referrerPhone);
  if (!referrerPhone) throw new Error('referrerPhone required');
  if (!opts.code) throw new Error('referral code required');
  const data = load();
  let link = data.links.find(l => l.referrerPhone === referrerPhone && l.code === opts.code);
  if (link) return link;

  const id = slug();
  const base = opts.baseUrl || process.env.PUBLIC_BASE_URL || 'https://app.example.com';
  // landing URL that records a click then redirects to click-to-WhatsApp
  const landingUrl = `${base}/r/${id}`;
  const waText = encodeURIComponent(opts.prefillText || `Hi! I'd like to join (referral code: ${opts.code})`);
  const waNumber = (opts.businessWaNumber || process.env.BUSINESS_WA_NUMBER || '').replace(/[^\d]/g, '');
  const clickToWhatsApp = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null;

  link = {
    id,
    referrerPhone,
    code: opts.code,
    landingUrl,
    clickToWhatsApp,
    clicks: 0,
    signups: 0,
    createdAt: nowIso()
  };
  data.links.push(link);
  save(data);
  return link;
}

function getLink(id) { return load().links.find(l => l.id === id) || null; }

/** Record a click (the /r/:id route calls this, then redirects to clickToWhatsApp). */
function recordClick(id, meta = {}) {
  const data = load();
  const link = data.links.find(l => l.id === id);
  if (!link) return null;
  link.clicks += 1;
  data.clicks.push({ linkId: id, at: nowIso(), ref: meta.ref || null });
  if (data.clicks.length > 5000) data.clicks = data.clicks.slice(-5000);
  save(data);
  return { redirectTo: link.clickToWhatsApp, code: link.code };
}

/** Record a signup attributed to a link (call when a referred contact converts). */
function recordSignup(id) {
  const data = load();
  const link = data.links.find(l => l.id === id);
  if (!link) return null;
  link.signups += 1;
  save(data);
  return link;
}

function linksFor(referrerPhone) {
  return load().links.filter(l => l.referrerPhone === normPhone(referrerPhone));
}

/** Leaderboard of top referrers by signups (then clicks). */
function leaderboard(limit = 10) {
  const data = load();
  const byPhone = {};
  for (const l of data.links) {
    const k = l.referrerPhone;
    if (!byPhone[k]) byPhone[k] = { referrerPhone: k, clicks: 0, signups: 0 };
    byPhone[k].clicks += l.clicks;
    byPhone[k].signups += l.signups;
  }
  return Object.values(byPhone)
    .sort((a, b) => (b.signups - a.signups) || (b.clicks - a.clicks))
    .slice(0, Math.max(1, Number(limit) || 10));
}

module.exports = { createLink, getLink, recordClick, recordSignup, linksFor, leaderboard };
