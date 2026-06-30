'use strict';

/**
 * Ecommerce Hub — order-event intake (all platforms).
 * Any platform webhook (Shopify, Woo, Magento, BigCommerce, Daraz, or your own)
 * can POST its order payload here; we normalize it and run notify + COD confirm.
 *
 * POST /api/ecommerce-hub/order-event?platform=shopify   (raw platform payload)
 * POST /api/ecommerce-hub/order-event   (already-normalized body)
 * GET  /api/ecommerce-hub/cod/pending   (list pending COD confirmations)
 * POST /api/ecommerce-hub/cod/test      (fire a sample order through the flow)
 *
 * Read/notify only. Never writes to the store, never captures payment.
 */

const express = require('express');
const router = express.Router();
const notify = require('../lib/ecommerceHub/orderNotify');
const cod = require('../lib/ecommerceHub/codStore');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) {
  if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' });
  next();
}

// Map common platform order payloads -> normalized order shape.
function normalize(platform, b) {
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
  // generic / already-normalized
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

router.post('/order-event', guard, function (req, res) {
  const order = normalize(req.query.platform, req.body);
  notify.processOrder(order)
    .then(function (r) { res.json({ ok: true, result: r }); })
    .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

router.get('/cod/pending', guard, function (req, res) {
  res.json({ ok: true, pending: cod.listPending() });
});

// Fire a sample order through the whole flow (dry-run unless ORDER_NOTIFY_ENABLED=true).
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

module.exports = router;
