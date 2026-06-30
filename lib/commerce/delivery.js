'use strict';
/**
 * delivery.js — Commerce Feature #4: delivery / shipment tracking.
 *
 * After an order is paid, the customer wants to know "where's my stuff?". This attaches a shipment
 * to an order (courier + tracking number), tracks a status timeline, and on each status update fires
 * a notify hook so the customer gets a WhatsApp update automatically. A public lookup lets them
 * check status by tracking number.
 *
 * Decoupled: customer-notify injected (guarded sender). Storage: JSON (data/deliveries.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'deliveries.json');
const FLOW = ['packed', 'dispatched', 'out_for_delivery', 'delivered', 'returned', 'failed'];

let notify = null; // async (phone, text) => any
function setNotifier(fn) { notify = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { shipments: [] }; }
  catch { return { shipments: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

const STATUS_MSG = {
  packed: 'Your order is packed and ready 📦',
  dispatched: 'Your order has been dispatched 🚚',
  out_for_delivery: 'Your order is out for delivery today 🛵',
  delivered: 'Your order has been delivered ✅ Thank you!',
  returned: 'Your order was returned. We\'ll reach out shortly.',
  failed: 'Delivery attempt failed. We\'ll retry — please confirm your address.'
};

/**
 * Create a shipment for an order.
 * @param {Object} opts { orderId, contactPhone, courier?, trackingNumber?, status? }
 */
function createShipment(opts = {}) {
  if (!opts.orderId) throw new Error('orderId required');
  const phone = normPhone(opts.contactPhone);
  const data = load();
  const status = FLOW.includes(opts.status) ? opts.status : 'packed';
  const shipment = {
    id: `SHIP-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    orderId: opts.orderId,
    contactPhone: phone,
    courier: opts.courier || '',
    trackingNumber: opts.trackingNumber || `TRK-${Date.now().toString(36).toUpperCase()}`,
    status,
    timeline: [{ status, at: nowIso() }],
    createdAt: nowIso()
  };
  data.shipments.push(shipment);
  save(data);
  maybeNotify(shipment, status);
  return shipment;
}

function maybeNotify(shipment, status) {
  if (notify && shipment.contactPhone && STATUS_MSG[status]) {
    const to = shipment.contactPhone.includes('@') ? shipment.contactPhone : `${shipment.contactPhone}@c.us`;
    const track = shipment.trackingNumber ? `\nTracking: ${shipment.trackingNumber}` : '';
    try { notify(to, `${STATUS_MSG[status]}${track}`); } catch { /* ignore */ }
  }
}

/** Advance/sets a shipment's status and notifies the customer. */
function updateStatus(id, status) {
  if (!FLOW.includes(status)) throw new Error(`invalid status. use: ${FLOW.join(', ')}`);
  const data = load();
  const s = data.shipments.find(x => x.id === id);
  if (!s) return null;
  s.status = status;
  s.timeline.push({ status, at: nowIso() });
  s.updatedAt = nowIso();
  save(data);
  maybeNotify(s, status);
  return s;
}

function getByOrder(orderId) { return load().shipments.find(s => s.orderId === orderId) || null; }
function track(trackingNumber) {
  const s = load().shipments.find(x => x.trackingNumber === trackingNumber);
  if (!s) return null;
  return { trackingNumber: s.trackingNumber, status: s.status, courier: s.courier, timeline: s.timeline };
}
function listShipments(filter = {}) {
  let rows = load().shipments;
  if (filter.status) rows = rows.filter(s => s.status === filter.status);
  if (filter.contactPhone) rows = rows.filter(s => s.contactPhone === normPhone(filter.contactPhone));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}

module.exports = { FLOW, setNotifier, createShipment, updateStatus, getByOrder, track, listShipments };
