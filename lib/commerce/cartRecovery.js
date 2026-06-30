'use strict';
/**
 * cartRecovery.js — Commerce Feature #3: abandoned cart recovery.
 *
 * Most carts never check out. This is free money left on the table. A sweep() finds carts that have
 * sat idle past a threshold (and have no resulting order yet) and sends a nudge ("You left items in
 * your cart — complete your order?") via an injected sender. It caps attempts so we don't spam, and
 * stops the moment the cart is checked out or cleared.
 *
 * Decoupled: cart source + sender injected (use the guarded sender, anti-ban). Tracks per-cart
 * recovery state in JSON (data/cart_recovery.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'cart_recovery.json');

let listCarts = null;  // () => [{ phone, items:[], updatedAt }]
let sender = null;     // async (phone, text) => any  (guarded sender)
function setCartSource(fn) { listCarts = typeof fn === 'function' ? fn : null; }
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

let CONFIG = {
  idleMinutes: 60,        // cart idle this long with no checkout -> eligible
  maxAttempts: 2,         // how many nudges before giving up
  gapHours: 24,           // min hours between nudges to the same cart
  message: 'Hi! You left some items in your cart 🛒. Reply *checkout* to complete your order — we saved it for you!'
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { state: {} }; }
  catch { return { state: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

/**
 * Run a recovery sweep. Call on an interval (e.g. every 15 min).
 * @returns {Promise<{ checked, nudged }>}
 */
async function sweep() {
  if (!listCarts) return { checked: 0, nudged: 0, reason: 'no cart source' };
  const carts = listCarts() || [];
  const data = load();
  const t = nowMs();
  let nudged = 0;

  for (const cart of carts) {
    const phone = normPhone(cart.phone);
    if (!phone || !cart.items || !cart.items.length) continue;
    const idleMs = t - new Date(cart.updatedAt || 0).getTime();
    if (idleMs < CONFIG.idleMinutes * 60000) continue; // not idle long enough

    const st = data.state[phone] || { attempts: 0, lastNudgeAt: 0, lastCartKey: '' };
    const cartKey = cart.items.map(i => `${i.productId}x${i.qty}`).join(',');

    // reset attempts if the cart changed (new intent)
    if (st.lastCartKey !== cartKey) { st.attempts = 0; st.lastCartKey = cartKey; }
    if (st.attempts >= CONFIG.maxAttempts) { data.state[phone] = st; continue; }
    if (t - st.lastNudgeAt < CONFIG.gapHours * 3600000) { data.state[phone] = st; continue; }

    if (sender) {
      try {
        const to = phone.includes('@') ? phone : `${phone}@c.us`;
        await sender(to, CONFIG.message);
        st.attempts += 1;
        st.lastNudgeAt = t;
        nudged++;
      } catch { /* skip on failure */ }
    }
    data.state[phone] = st;
  }

  save(data);
  return { checked: carts.length, nudged, at: iso(t) };
}

/** Call when a cart converts (checkout) so we stop nudging + record the win. */
function markRecovered(phone) {
  const p = normPhone(phone);
  const data = load();
  if (data.state[p]) {
    data.state[p].recoveredAt = iso(nowMs());
    data.state[p].attempts = CONFIG.maxAttempts; // stop further nudges
    save(data);
  }
  return { ok: true };
}

function stats() {
  const data = load();
  const rows = Object.values(data.state);
  return {
    tracked: rows.length,
    recovered: rows.filter(r => r.recoveredAt).length,
    nudgesSent: rows.reduce((s, r) => s + (r.attempts || 0), 0)
  };
}

module.exports = { configure, setCartSource, setSender, sweep, markRecovered, stats };
