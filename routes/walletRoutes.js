// routes/walletRoutes.js — Commerce #6: customer wallet / store credit.
//
// Wire-up (server.js):
//   app.use('/api/wallet', require('./routes/walletRoutes'));
//
// At checkout, apply wallet first: const { used, remainingToPay } = wallet.applyToOrder(phone, total, { orderId });

const express = require('express');
const router = express.Router();

let wallet;
try { wallet = require('../lib/commerce/wallet'); } catch { wallet = null; }

function ensure(res) {
  if (!wallet) { res.status(503).json({ ok: false, error: 'Wallet not available' }); return false; }
  return true;
}

// Balance + recent ledger.
router.get('/:phone', (req, res) => {
  if (!ensure(res)) return;
  const w = wallet.getWallet(req.params.phone);
  res.json({ ok: true, balance: w.balance, currency: w.currency, ledger: wallet.ledger(req.params.phone, Number(req.query.limit) || 50) });
});

// Credit (top-up / refund). Body: { amount, reason?, ref? }
router.post('/:phone/credit', (req, res) => {
  if (!ensure(res)) return;
  const { amount, reason, ref } = req.body || {};
  try { res.json({ ok: true, wallet: wallet.credit(req.params.phone, amount, { reason, ref }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Debit (spend). Body: { amount, reason?, ref? }
router.post('/:phone/debit', (req, res) => {
  if (!ensure(res)) return;
  const { amount, reason, ref } = req.body || {};
  try {
    const r = wallet.debit(req.params.phone, amount, { reason, ref });
    res.status(r.ok ? 200 : 400).json({ ok: r.ok, ...r });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
