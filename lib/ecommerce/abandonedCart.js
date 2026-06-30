'use strict';
/**
 * abandonedCart.js — Ecommerce Feature #1: abandoned cart recovery.
 *
 * SuperSender has ecommerce; the single biggest easy revenue win there is recovering carts people
 * start but don't pay for. This tracks open carts, detects abandonment after a configurable delay,
 * and runs a staged WhatsApp nudge sequence ("you left something behind" -> reminder -> small
 * incentive). When the customer orders, the cart is marked recovered and nudges stop.
 *
 * Sending is injected (use the guarded sender / send guard #sending1). Storage: JSON (data/carts.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'carts.json');

// Staged nudges by minutes-after-abandonment.
let SEQUENCE = [
  { afterMin: 60,   template: 'Hi {{name}}! 👋 You left {{items}} in your cart. Complete your order here: {{link}}' },
  { afterMin: 1440, template: 'Still interested in {{items}}? Your cart is waiting — tap to checkout: {{link}}' },
  { afterMin: 4320, template: 'Last chance! Use code SAVE10 for 10% off {{items}}: {{link}}' }
];
function configureSequence(seq) { if (Array.isArray(seq) && seq.length) SEQUENCE = seq.slice().sort((a,b)=>a.afterMin-b.afterMin); return SEQUENCE; }

let sender = null;       // async (phone, text) => any (guarded)
let recordEvent = null;  // (phone, ev) => void (customer360)
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }
function setEventRecorder(fn) { recordEvent = typeof fn === 'function' ? fn : null; }

// abandonment threshold: a cart with no activity for this long is 'abandoned'
let ABANDON_AFTER_MIN = 30;
function setAbandonAfter(min) { ABANDON_AFTER_MIN = Number(min) || 30; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { carts: [] }; }
  catch { return { carts: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
function render(tpl, ctx) { return String(tpl||'').replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] != null ? String(ctx[k]) : ''); }

/** Create/update a cart for a contact. Resets activity timer. */
function upsertCart(opts = {}) {
  const phone = normPhone(opts.phone);
  if (!phone) throw new Error('phone required');
  const data = load();
  let cart = data.carts.find(c => c.phone === phone && c.status === 'open');
  const now = nowMs();
  if (!cart) {
    cart = { id: `CART-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, phone, name: opts.name || '', status: 'open', items: [], value: 0, checkoutLink: opts.checkoutLink || '', stage: 0, createdAt: iso(now), lastActivityAt: iso(now) };
    data.carts.push(cart);
  }
  if (Array.isArray(opts.items)) cart.items = opts.items;
  if (opts.value != null) cart.value = Number(opts.value);
  if (opts.checkoutLink) cart.checkoutLink = opts.checkoutLink;
  if (opts.name) cart.name = opts.name;
  cart.lastActivityAt = iso(now);
  cart.status = 'open';
  cart.stage = 0; // reset nudges on new activity
  save(data);
  return cart;
}

/** Customer ordered -> mark their open cart recovered (stops nudges). */
function markRecovered(phone) {
  const data = load();
  const cart = data.carts.find(c => c.phone === normPhone(phone) && c.status !== 'recovered');
  if (!cart) return null;
  cart.status = 'recovered';
  cart.recoveredAt = iso(nowMs());
  save(data);
  return cart;
}

function itemsLabel(cart) {
  if (!cart.items || !cart.items.length) return 'your items';
  const names = cart.items.map(i => i.name || i.title || i).slice(0, 3);
  return names.join(', ');
}

/**
 * Sweep: mark stale open carts abandoned, and send the due nudge for abandoned carts.
 * Call on an interval (every few minutes).
 */
async function tick() {
  const data = load();
  const now = nowMs();
  let abandoned = 0, nudged = 0, recovered = 0;

  for (const cart of data.carts) {
    if (cart.status === 'recovered') { recovered++; continue; }
    const idleMin = (now - new Date(cart.lastActivityAt).getTime()) / 60000;

    if (cart.status === 'open' && idleMin >= ABANDON_AFTER_MIN) {
      cart.status = 'abandoned';
      cart.abandonedAt = iso(now);
      abandoned++;
      if (recordEvent) { try { recordEvent(cart.phone, { type: 'note', text: 'Cart abandoned' }); } catch {} }
    }

    if (cart.status === 'abandoned') {
      const sinceAbandonMin = (now - new Date(cart.abandonedAt).getTime()) / 60000;
      const step = SEQUENCE[cart.stage];
      if (step && sinceAbandonMin >= step.afterMin) {
        const text = render(step.template, { name: cart.name || 'there', items: itemsLabel(cart), link: cart.checkoutLink || '' });
        try { if (sender) { await sender(cart.phone, text); nudged++; } } catch {}
        cart.stage += 1;
        if (cart.stage >= SEQUENCE.length) cart.status = 'lost';
      }
    }
  }
  save(data);
  return { abandoned, nudged, recovered, at: iso(now) };
}

function listCarts(filter = {}) {
  let rows = load().carts;
  if (filter.status) rows = rows.filter(c => c.status === filter.status);
  return rows;
}
function stats() {
  const rows = load().carts;
  const by = (s) => rows.filter(c => c.status === s).length;
  const recovered = by('recovered');
  const abandoned = by('abandoned') + by('lost') + recovered;
  return { open: by('open'), abandoned: by('abandoned'), recovered, lost: by('lost'), recoveryRatePct: abandoned ? Math.round((recovered/abandoned)*1000)/10 : 0 };
}

module.exports = { configureSequence, setSender, setEventRecorder, setAbandonAfter, upsertCart, markRecovered, tick, listCarts, stats };
