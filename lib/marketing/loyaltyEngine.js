'use strict';
/**
 * loyaltyEngine.js — Marketing Automation Feature #4: loyalty points, tiers, and referrals.
 *
 * Goal: make one-time buyers come back. Customers earn points (on orders or any event you choose),
 * climb tiers automatically, and can refer friends for bonus points. The contact's loyalty state
 * (points + tier) is exposed so Feature #1 segments can target e.g. "tier = gold" or
 * "loyaltyPoints >= 1000" — which then feeds drips (#2) and segment broadcasts (#3).
 *
 * Storage: JSON (data/marketing_loyalty.json), matching the rest of the app.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'marketing_loyalty.json');

// Default tier thresholds by LIFETIME points. Override via configureTiers().
let TIERS = [
  { name: 'bronze',   min: 0 },
  { name: 'silver',   min: 500 },
  { name: 'gold',     min: 1500 },
  { name: 'platinum', min: 5000 }
];

// Default: points earned per 1 currency unit spent, and the referral bonus.
let CONFIG = {
  pointsPerCurrency: 1,    // 1 point per 1 PKR spent (tune as you like)
  referralBonus: 500,      // points to the referrer when a referee converts
  refereeBonus: 200        // points to the new customer on their first conversion
};

function load() {
  try {
    return fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      : { accounts: {}, referrals: [] };
  } catch {
    return { accounts: {}, referrals: [] };
  }
}
function save(d) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch { /* best-effort */ }
}

const nowIso = () => new Date().toISOString();
function key(contact) {
  return String((contact && (contact.phone || contact.id)) || contact || '').trim();
}

function tierForPoints(lifetime) {
  let tier = TIERS[0].name;
  for (const t of TIERS) if (lifetime >= t.min) tier = t.name;
  return tier;
}

function ensureAccount(data, k) {
  if (!data.accounts[k]) {
    data.accounts[k] = {
      key: k,
      points: 0,          // current redeemable balance
      lifetimePoints: 0,  // ever-earned, drives tier
      tier: TIERS[0].name,
      referralCode: null,
      referredBy: null,
      ledger: [],         // { type:'earn'|'redeem'|'referral', amount, reason, at }
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }
  return data.accounts[k];
}

function recompute(acc) {
  acc.tier = tierForPoints(acc.lifetimePoints);
  acc.updatedAt = nowIso();
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function configureTiers(tiers) {
  if (Array.isArray(tiers) && tiers.length) {
    TIERS = tiers.slice().sort((a, b) => a.min - b.min);
  }
  return TIERS;
}
function configure(opts = {}) {
  CONFIG = { ...CONFIG, ...opts };
  return CONFIG;
}

// ---------------------------------------------------------------------------
// Earn / redeem
// ---------------------------------------------------------------------------
function earn(contact, amount, reason = 'earn') {
  const k = key(contact);
  if (!k) throw new Error('contact needs a phone or id');
  const pts = Math.max(0, Math.round(Number(amount) || 0));
  const data = load();
  const acc = ensureAccount(data, k);
  acc.points += pts;
  acc.lifetimePoints += pts;
  acc.ledger.push({ type: 'earn', amount: pts, reason, at: nowIso() });
  recompute(acc);
  save(data);
  return acc;
}

/** Earn from an order total using pointsPerCurrency. */
function earnFromOrder(contact, orderTotal, reason = 'order') {
  const pts = Math.round(Number(orderTotal || 0) * CONFIG.pointsPerCurrency);
  return earn(contact, pts, reason);
}

function redeem(contact, amount, reason = 'redeem') {
  const k = key(contact);
  if (!k) throw new Error('contact needs a phone or id');
  const pts = Math.max(0, Math.round(Number(amount) || 0));
  const data = load();
  const acc = ensureAccount(data, k);
  if (acc.points < pts) throw new Error(`insufficient points: has ${acc.points}, needs ${pts}`);
  acc.points -= pts;
  acc.ledger.push({ type: 'redeem', amount: -pts, reason, at: nowIso() });
  recompute(acc);
  save(data);
  return acc;
}

function getAccount(contact) {
  const data = load();
  const k = key(contact);
  return data.accounts[k] || null;
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------
function makeCode(k) {
  const base = k.replace(/[^\dA-Za-z]/g, '').slice(-4).toUpperCase() || 'USER';
  return `REF-${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Get (or lazily create) a contact's referral code. */
function getOrCreateReferralCode(contact) {
  const k = key(contact);
  if (!k) throw new Error('contact needs a phone or id');
  const data = load();
  const acc = ensureAccount(data, k);
  if (!acc.referralCode) { acc.referralCode = makeCode(k); save(data); }
  return acc.referralCode;
}

/** Record that a new contact was referred via a code. Does not award yet (await conversion). */
function registerReferral(refereeContact, referralCode) {
  const data = load();
  const referrerKey = Object.keys(data.accounts).find(k => data.accounts[k].referralCode === referralCode);
  if (!referrerKey) return { ok: false, error: 'unknown referral code' };
  const refereeK = key(refereeContact);
  if (!refereeK) return { ok: false, error: 'referee needs a phone or id' };
  if (refereeK === referrerKey) return { ok: false, error: 'cannot refer yourself' };

  const acc = ensureAccount(data, refereeK);
  if (acc.referredBy) return { ok: false, error: 'referee already attributed' };
  acc.referredBy = referrerKey;
  data.referrals.push({ referrer: referrerKey, referee: refereeK, code: referralCode, status: 'pending', at: nowIso() });
  save(data);
  return { ok: true, referrer: referrerKey, referee: refereeK };
}

/**
 * Mark a referred contact as converted (e.g. first paid order). Awards both sides their bonus once.
 */
function convertReferral(refereeContact) {
  const data = load();
  const refereeK = key(refereeContact);
  const ref = data.referrals.find(r => r.referee === refereeK && r.status === 'pending');
  if (!ref) return { ok: false, error: 'no pending referral for this contact' };

  const referrer = ensureAccount(data, ref.referrer);
  const referee = ensureAccount(data, refereeK);
  referrer.points += CONFIG.referralBonus;
  referrer.lifetimePoints += CONFIG.referralBonus;
  referrer.ledger.push({ type: 'referral', amount: CONFIG.referralBonus, reason: `referred ${refereeK}`, at: nowIso() });
  recompute(referrer);

  referee.points += CONFIG.refereeBonus;
  referee.lifetimePoints += CONFIG.refereeBonus;
  referee.ledger.push({ type: 'referral', amount: CONFIG.refereeBonus, reason: 'referral signup bonus', at: nowIso() });
  recompute(referee);

  ref.status = 'converted';
  ref.convertedAt = nowIso();
  save(data);
  return { ok: true, referrerBonus: CONFIG.referralBonus, refereeBonus: CONFIG.refereeBonus };
}

// ---------------------------------------------------------------------------
// Segment integration
// ---------------------------------------------------------------------------
/**
 * Enrich a contact object with loyalty fields so Feature #1 segments can target them:
 *   loyaltyPoints, loyaltyLifetime, loyaltyTier
 * Use this in your CRM contact loader (the same one segments/drip/broadcast use).
 */
function enrichContact(contact) {
  const acc = getAccount(contact);
  return {
    ...contact,
    loyaltyPoints: acc ? acc.points : 0,
    loyaltyLifetime: acc ? acc.lifetimePoints : 0,
    loyaltyTier: acc ? acc.tier : TIERS[0].name
  };
}

function listAccounts() {
  const data = load();
  return Object.values(data.accounts);
}

module.exports = {
  configure,
  configureTiers,
  earn,
  earnFromOrder,
  redeem,
  getAccount,
  listAccounts,
  // referrals
  getOrCreateReferralCode,
  registerReferral,
  convertReferral,
  // segment integration
  enrichContact,
  tierForPoints
};
