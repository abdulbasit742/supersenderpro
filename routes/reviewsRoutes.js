'use strict';
// #77 Reviews & Ratings — HTTP routes. Mount: app.use('/api/reviews', require('./routes/reviewsRoutes'));
const express = require('express');
const router = express.Router();
const reviews = require('../lib/reviews');
const { maskReview } = require('../lib/reviews/privacy');

function tenantOf(req) { return (req.headers['x-tenant-id'] || (req.user && req.user.tenantId) || req.query.tenantId || 'default'); }

router.get('/health', (req, res) => res.json(reviews.doctor.check()));

// Submit a review
router.post('/', (req, res) => {
  try {
    const { productId, contactId, rating, title, body, orderId } = req.body || {};
    const out = reviews.submit({ tenantId: tenantOf(req), productId, contactId, rating, title, body, orderId });
    res.status(out.ok ? 200 : 400).json(Object.assign({}, out, { review: maskReview(out.review) }));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Moderation queue (pending + flagged)
router.get('/queue', (req, res) => {
  const db = reviews.store.load();
  const rows = reviews.store.list(db, tenantOf(req)).filter(r => r.status === 'pending' || r.status === 'flagged').map(maskReview);
  res.json({ ok: true, count: rows.length, reviews: rows });
});

// Approve / reject
router.post('/:reviewId/moderate', (req, res) => {
  const { status, by } = req.body || {};
  const out = reviews.moderate({ tenantId: tenantOf(req), reviewId: req.params.reviewId, status, by });
  res.status(out.ok ? 200 : 400).json(Object.assign({}, out, { review: maskReview(out.review) }));
});

// Aggregate for a product
router.get('/product/:productId', (req, res) => {
  res.json({ ok: true, aggregate: reviews.product(tenantOf(req), req.params.productId) });
});

// Approved reviews for a product (public-facing, masked)
router.get('/product/:productId/list', (req, res) => {
  const db = reviews.store.load();
  const rows = reviews.store.list(db, tenantOf(req), { productId: req.params.productId, status: 'approved' }).map(maskReview);
  res.json({ ok: true, count: rows.length, reviews: rows });
});

// Top-rated products
router.get('/top', (req, res) => {
  res.json({ ok: true, products: reviews.top(tenantOf(req), Number(req.query.limit) || 20) });
});

module.exports = router;
