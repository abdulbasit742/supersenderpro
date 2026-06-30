'use strict';
// #77 Reviews & Ratings — submit + moderation flow.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');

function id() { return 'rev_' + crypto.randomBytes(8).toString('hex'); }

function clampRating(r) {
  let n = Math.round(Number(r) || 0);
  if (n < config.minRating) n = config.minRating;
  if (n > config.maxRating) n = config.maxRating;
  return n;
}

function autoFlag(text) {
  if (!text) return false;
  const lc = String(text).toLowerCase();
  return config.flagWords.some(w => w && lc.includes(w));
}

function submit(db, { tenantId, productId, contactId, rating, title, body, orderId }) {
  if (!productId || !contactId) throw new Error('productId and contactId required');
  if (config.oneePerProduct) {
    const dup = db.reviews.find(r => r.tenantId === (tenantId || 'default') && r.productId === productId && r.contactId === contactId);
    if (dup) return { ok: false, error: 'already_reviewed', review: dup };
  }
  const flagged = autoFlag(title) || autoFlag(body);
  const rec = {
    id: id(), tenantId: tenantId || 'default', productId, contactId,
    rating: clampRating(rating), title: title || '', body: body || '', orderId: orderId || null,
    status: flagged ? 'flagged' : (config.autoApprove ? 'approved' : 'pending'),
    flagged, createdAt: new Date().toISOString(), moderatedAt: null, moderatedBy: null
  };
  db.reviews.push(rec);
  maybeAlert(rec);
  return { ok: true, review: rec };
}

function setStatus(db, { tenantId, reviewId, status, by }) {
  const rec = db.reviews.find(r => r.id === reviewId && r.tenantId === (tenantId || 'default'));
  if (!rec) return { ok: false, error: 'not_found' };
  if (!['pending', 'approved', 'rejected', 'flagged'].includes(status)) return { ok: false, error: 'invalid_status' };
  rec.status = status;
  rec.moderatedAt = new Date().toISOString();
  rec.moderatedBy = by || 'system';
  return { ok: true, review: rec };
}

// Raise an admin alert (#28) for low ratings if the dept is wired.
function maybeAlert(rec) {
  if (rec.rating > config.alertAtOrBelow) return;
  try {
    const alerts = require('../adminAlert');
    if (alerts && typeof alerts.raise === 'function') {
      alerts.raise({ tenantId: rec.tenantId, type: 'low_review', severity: 'warning', message: `Low review (${rec.rating}\u2605) on ${rec.productId}`, ref: rec.id });
    }
  } catch (_) { /* alerts dept absent — advisory only */ }
}

module.exports = { submit, setStatus, autoFlag, clampRating };
