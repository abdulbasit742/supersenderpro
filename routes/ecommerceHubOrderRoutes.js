'use strict';

/**
 * Ecommerce Hub — order + shipment event intake (all platforms).
 * Any platform webhook can POST its payload here; we normalize it and run
 * notify + COD confirm (order-event) or tracking notify (shipment-event).
 *
 * POST /api/ecommerce-hub/order-event?platform=shopify     (new order)
 * POST /api/ecommerce-hub/shipment-event?platform=shopify  (fulfillment/shipped + tracking)
 * GET  /api/ecommerce-hub/cod/pending
 * POST /api/ecommerce-hub/cod/test
 * GET  /api/ecommerce-hub/tracking/list
 * POST /api/ecommerce-hub/tracking/test
 *
 * Read/notify only. Never writes to the store, never captures payment.
 */

const express = require('express');
const router = express.Router();
const notify = require('../lib/ecommerceHub/orderNotify');
const cod = require('../lib/ecommerceHub/codStore');
const tracking = require('../lib/ecommerceHub/tracking');
const trackingStore = require('../lib/ecommerceHub/trackingStore');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) {
  if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' });
  next();
}

function normalizeOrder(platform, b) {
  b = b || {};
  const p = String(platform || b.platform || 'generic').toLowerCase();

  if (p === 'shopify') {
    const sa = b.shipping_address || b.billing_address || {};
    return {
      platform: 'shopify', orderId: String(b.id || b.order_number || ''),
      buyerName: [sa.first_name, sa.last_name].filter(Boolean).join(' ') || (b.customer && [b.customer.first_name, b.customer.last_name].filter(Boolean).join(' ')) || null,
      buyerPhone: b.phone || sa.phone || (b.customer && b.customer.phone) || null,
      total: b.total_price != null ? Number(b.total_price) : null,
      currency: b.currency || 'PKR',
      paymentMethod: (b.gateway || (b.payment_gateway_names && b.payment_gateway_names[0])) || (b.financial_status === 'pending' ? 'cod' : 'prepaid'),
      cod: /cash on delivery|cod/i.test(String(b.gateway || (b.payment_gateway_names && b.payment_gateway_names.join(',')) || '')),
      itemsText: (b.line_items || []).map(function (li) { return li.quantity + 'x ' + li.title; }).slice(0, 5).join(', ') || null,
      createdAt: b.created_at || null
    };
  }
  if (p === 'woocommerce' || p === 'woo') {
    const bl = b.billing || {};
    return {
      platform: 'woocommerce', orderId: String(b.id || b.number || ''),
      buyerName: [bl.first_name, bl.last_name].filter(Boolean).join(' ') || null,
      buyerPhone: bl.phone || null,
      total: b.total != null ? Number(b.total) : null,
      currency: b.currency || 'PKR',
      paymentMethod: b.payment_method || b.payment_method_title || 'prepaid',
      cod: /cod|cash/i.test(String(b.payment_method || b.payment_method_title || '')),
      itemsText: (b.line_items || []).map(function (li) { return li.quantity + 'x ' + li.name; }).slice(0, 5).join(', ') || null,
      createdAt: b.date_created || null
    };
  }
  if (p === 'magento') {
    return {
      platform: 'magento', orderId: String(b.increment_id || b.entity_id || ''),
      buyerName: [b.customer_firstname, b.customer_lastname].filter(Boolean).join(' ') || null,
      buyerPhone: (b.billing_address && b.billing_address.telephone) || null,
      total: b.grand_total != null ? Number(b.grand_total) : null,
      currency: b.order_currency_code || 'PKR',
      paymentMethod: (b.payment && b.payment.method) || 'prepaid',
      cod: /cashondelivery|cod|cash/i.test(String(b.payment && b.payment.method || '')),
      itemsText: (b.items || []).map(function (li) { return li.qty_ordered + 'x ' + li.name; }).slice(0, 5).join(', ') || null,
      createdAt: b.created_at || null
    };
  }
  if (p === 'bigcommerce') {
    const ba = b.billing_address || {};
    return {
      platform: 'bigcommerce', orderId: String(b.id || ''),
      buyerName: [ba.first_name, ba.last_name].filter(Boolean).join(' ') || null,
      buyerPhone: ba.phone || null,
      total: b.total_inc_tax != null ? Number(b.total_inc_tax) : null,
      currency: b.currency_code || 'PKR',
      paymentMethod: b.payment_method || 'prepaid',
      cod: /cod|cash/i.test(String(b.payment_method || '')),
      itemsText: null, createdAt: b.date_created || null
    };
  }
  if (p === 'daraz') {
    return {
      platform: 'daraz', orderId: String(b.order_id || b.order_number || ''),
      buyerName: [b.customer_first_name, b.customer_last_name].filter(Boolean).join(' ') || null,
      buyerPhone: (b.address_billing && b.address_billing.phone) || null,
      total: b.price != null ? Number(b.price) : null,
      currency: 'PKR',
      paymentMethod: b.payment_method || 'cod',
      cod: /cod|cash/i.test(String(b.payment_method || 'cod')),
      itemsText: null, createdAt: b.created_at || null
    };
  }
  return {
    platform: p, orderId: String(b.orderId || b.order_id || b.id || ''),
    buyerName: b.buyerName || null,
    buyerPhone: b.buyerPhone || b.phone || null,
    total: b.total != null ? Number(b.total) : null,
    currency: b.currency || 'PKR',
    paymentMethod: b.paymentMethod || b.payment || 'prepaid',
    cod: b.cod === true || /cod|cash/i.test(String(b.paymentMethod || b.payment || '')),
    itemsText: b.itemsText || null,
    createdAt: b.createdAt || null
  };
}

// Pull (orderId, buyerPhone, courier, trackingId) out of a platform fulfillment payload.
function normalizeShipment(platform, b) {
  b = b || {};
  const p = String(platform || b.platform || 'generic').toLowerCase();

  if (p === 'shopify') {
    const f = (b.fulfillments && b.fulfillments[0]) || b;
    const sa = b.shipping_address || b.billing_address || {};
    return {
      platform: 'shopify', orderId: String(b.order_id || b.id || b.order_number || ''),
      buyerPhone: b.phone || sa.phone || null,
      courier: f.tracking_company || b.tracking_company || 'generic',
      trackingId: f.tracking_number || (f.tracking_numbers && f.tracking_numbers[0]) || b.tracking_number || null,
      status: 'shipped'
    };
  }
  if (p === 'woocommerce' || p === 'woo') {
    const bl = b.billing || {};
    return {
      platform: 'woocommerce', orderId: String(b.order_id || b.id || b.number || ''),
      buyerPhone: bl.phone || b.phone || null,
      courier: b.tracking_provider || b.courier || 'generic',
      trackingId: b.tracking_number || b.trackingId || null,
      status: 'shipped'
    };
  }
  if (p === 'magento') {
    const t = (b.tracks && b.tracks[0]) || {};
    return {
      platform: 'magento', orderId: String(b.order_id || b.increment_id || b.entity_id || ''),
      buyerPhone: b.phone || null,
      courier: t.carrier_code || t.title || b.courier || 'generic',
      trackingId: t.track_number || b.tracking_number || null,
      status: 'shipped'
    };
  }
  if (p === 'bigcommerce') {
    return {
      platform: 'bigcommerce', orderId: String(b.order_id || b.id || ''),
      buyerPhone: b.phone || null,
      courier: b.shipping_provider || b.courier || 'generic',
      trackingId: b.tracking_number || null,
      status: 'shipped'
    };
  }
  if (p === 'daraz') {
    return {
      platform: 'daraz', orderId: String(b.order_id || b.order_number || ''),
      buyerPhone: (b.address_billing && b.address_billing.phone) || b.phone || null,
      courier: b.shipment_provider || 'daraz',
      trackingId: b.tracking_number || b.tracking_code || null,
      status: 'shipped'
    };
  }
  return {
    platform: p, orderId: String(b.orderId || b.order_id || b.id || ''),
    buyerPhone: b.buyerPhone || b.phone || null,
    courier: b.courier || b.tracking_provider || 'generic',
    trackingId: b.trackingId || b.tracking_number || null,
    status: b.status || 'shipped'
  };
}

router.post('/order-event', guard, function (req, res) {
  const order = normalizeOrder(req.query.platform, req.body);
  notify.processOrder(order)
    .then(function (r) { res.json({ ok: true, result: r }); })
    .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

router.post('/shipment-event', guard, function (req, res) {
  const ship = normalizeShipment(req.query.platform, req.body);
  if (!ship.trackingId) return res.status(400).json({ ok: false, error: 'trackingId_missing_in_payload' });
  tracking.setTracking(ship).then(function (saved) {
    // message the buyer with the tracking link (dry-run safe)
    if (ship.buyerPhone) {
      return notify.send(ship.buyerPhone, tracking.buyerMsg(ship)).then(function (sent) {
        res.json({ ok: true, tracking: saved.record, link: saved.link, notified: sent });
      });
    }
    res.json({ ok: true, tracking: saved.record, link: saved.link, notified: null });
  }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

router.get('/cod/pending', guard, function (req, res) {
  res.json({ ok: true, pending: cod.listPending() });
});

router.post('/cod/test', guard, function (req, res) {
  const sample = Object.assign({
    platform: 'daraz', orderId: 'TEST-' + Date.now(), buyerName: 'Test Buyer',
    buyerPhone: (req.body && req.body.buyerPhone) || '0300000000', total: 2499, currency: 'PKR',
    paymentMethod: 'cod', itemsText: '1x Wireless Earbuds Pro'
  }, req.body || {});
  notify.processOrder(sample)
    .then(function (r) { res.json({ ok: true, sample: sample, result: r }); })
    .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

router.get('/tracking/list', guard, function (req, res) {
  res.json({ ok: true, tracking: trackingStore.list() });
});

router.post('/tracking/test', guard, function (req, res) {
  const sample = Object.assign({
    platform: 'daraz', orderId: 'TEST-' + Date.now(),
    buyerPhone: (req.body && req.body.buyerPhone) || '0300000000',
    courier: 'tcs', trackingId: 'TCS' + Math.floor(Math.random() * 1e9), status: 'shipped'
  }, req.body || {});
  tracking.setTracking(sample).then(function (saved) {
    if (sample.buyerPhone) {
      return notify.send(sample.buyerPhone, tracking.buyerMsg(sample)).then(function (sent) {
        res.json({ ok: true, sample: sample, link: saved.link, notified: sent });
      });
    }
    res.json({ ok: true, sample: sample, link: saved.link });
  }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

module.exports = router;
