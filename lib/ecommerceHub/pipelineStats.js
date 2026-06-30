'use strict';

/**
 * Ecommerce Hub — pipeline funnel snapshot (read-only).
 * Reads the timeline + tracking + review stores to show how orders flow through
 * the pipeline: created -> shipped -> delivered -> reviewed. Pure read of JSON.
 */

const fs = require('fs');
const path = require('path');

function p(envKey, def) { const v = process.env[envKey] || def; return path.isAbsolute(v) ? v : path.join(process.cwd(), v); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) { return null; } }

function build() {
  const tl = readJson(p('ECOMMERCE_HUB_TIMELINE_PATH', 'data/ecommerce-timeline.json'));
  const reviewsFile = readJson(p('ECOMMERCE_HUB_REVIEW_PATH', 'data/ecommerce-reviews.json'));

  let created = 0, shipped = 0, delivered = 0;
  if (tl && tl.timelines) {
    Object.keys(tl.timelines).forEach(function (k) {
      const events = (tl.timelines[k] || []).map(function (e) { return e.event; });
      if (events.indexOf('order_created') !== -1) created++;
      if (events.indexOf('shipped') !== -1) shipped++;
      if (events.indexOf('delivered') !== -1) delivered++;
    });
  }
  const reviewed = reviewsFile && Array.isArray(reviewsFile.reviews) ? reviewsFile.reviews.length : 0;

  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  return {
    ok: true,
    funnel: {
      created: created,
      shipped: shipped,
      delivered: delivered,
      reviewed: reviewed
    },
    conversion: {
      createdToShipped: pct(shipped, created),
      shippedToDelivered: pct(delivered, shipped),
      deliveredToReviewed: pct(reviewed, delivered)
    }
  };
}

module.exports = { build };
