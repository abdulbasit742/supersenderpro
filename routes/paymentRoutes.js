// routes/paymentRoutes.js
// Self-mountable Express router for AI payment-screenshot confirmation.
// Mount in server.js with a single line:
//     app.use('/api/payment-confirm', require('./routes/paymentRoutes'));
//
// The screenshot can be sent as multipart `image`, JSON `imageBase64`, or path.

const express = require('express');
const fs = require('fs');
const router = express.Router();
const pay = require('../lib/payments/paymentConfirm');

let upload = null;
try { const multer = require('multer'); upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); } catch {}
function resolveBuffer(req) {
  if (req.file && req.file.buffer) return req.file.buffer;
  const body = req.body || {};
  if (body.imageBase64) return Buffer.from(String(body.imageBase64).replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (body.path && fs.existsSync(body.path)) return fs.readFileSync(body.path);
  return null;
}
const multipart = upload ? upload.single('image') : (req, res, next) => next();

// POST /api/payment-confirm/expect   Body: { storeId?, orderId, amount, phone? }
router.post('/expect', (req, res) => {
  try {
    const { storeId = 'default_store', orderId, amount, phone } = req.body || {};
    if (!orderId || amount == null) return res.status(400).json({ success: false, error: 'orderId and amount are required' });
    res.json({ success: true, expected: pay.setExpected({ storeId, orderId, amount, phone }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/payment-confirm/verify   (image + { phone?, orderId?, expectedAmount? })
router.post('/verify', multipart, async (req, res) => {
  try {
    const buffer = resolveBuffer(req);
    if (!buffer) return res.status(400).json({ success: false, error: 'no image provided (multipart image, imageBase64, or path)' });
    const body = req.body || {};
    const result = await pay.verifyScreenshot({ storeId: body.storeId || 'default_store', buffer, phone: body.phone, orderId: body.orderId, expectedAmount: body.expectedAmount != null ? Number(body.expectedAmount) : undefined });
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/payment-confirm/txns?storeId=&decision=&phone=
router.get('/txns', (req, res) => {
  try { const { storeId = 'default_store', decision, phone } = req.query; res.json({ success: true, txns: pay.listTxns({ storeId, decision, phone }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/payment-confirm/txn/:txnId?storeId=
router.get('/txn/:txnId', (req, res) => {
  const t = pay.getTxn({ storeId: req.query.storeId || 'default_store', txnId: req.params.txnId });
  if (!t) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, txn: t });
});

// GET /api/payment-confirm/health
router.get('/health', async (req, res) => {
  try { res.json({ success: true, ...(await pay.health()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
