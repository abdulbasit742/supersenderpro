// routes/deliveryReceiptRoutes.js — Sending #4: delivery/read receipts.
//
// Wire-up (server.js) — track on send, update from WA ack events, feed smart-send-time:
//   const receipts = require('./lib/sending/deliveryReceipts');
//   receipts.setOnRead((phone) => require('./lib/sending/smartSendTime').recordEngagement(phone));
//   // on send: receipts.track(msg.id._serialized, { phone, campaignId });
//   // waClient.on('message_ack', (msg, ack) => receipts.updateStatus(msg.id._serialized, ackToStatus(ack)));
//   app.use('/api/receipts', require('./routes/deliveryReceiptRoutes'));

const express = require('express');
const router = express.Router();

let receipts;
try { receipts = require('../lib/sending/deliveryReceipts'); } catch { receipts = null; }

function ensure(res) {
  if (!receipts) { res.status(503).json({ ok: false, error: 'Receipts not available' }); return false; }
  return true;
}

// Rates. Query: ?campaignId=
router.get('/rates', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, rates: receipts.rates(req.query.campaignId) });
});

// Track a sent message. Body: { messageId, phone, campaignId? }
router.post('/track', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, message: receipts.track((req.body || {}).messageId, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Update status (from a receipt/ack). Body: { messageId, status, error? }
router.post('/status', (req, res) => {
  if (!ensure(res)) return;
  const { messageId, status, error } = req.body || {};
  const m = receipts.updateStatus(messageId, status, error);
  if (!m) return res.status(404).json({ ok: false, error: 'Message not tracked' });
  res.json({ ok: true, message: m });
});

module.exports = router;
