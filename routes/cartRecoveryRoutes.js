// routes/cartRecoveryRoutes.js — Commerce #3: abandoned cart recovery.
//
// Wire-up (server.js):
//   const recovery = require('./lib/commerce/cartRecovery');
//   const orders = require('./lib/commerce/orders');
//   recovery.setCartSource(() => Object.values(require('./lib/commerce/orders')._carts || {})); // or expose a listCarts()
//   recovery.setSender(guardedSend);
//   require('node-cron').schedule('*/15 * * * *', () => recovery.sweep().catch(()=>{}));
//   // when an order is placed, stop nudging:
//   orders.setOnOrder((o) => recovery.markRecovered(o.phone));
//   app.use('/api/commerce/cart-recovery', require('./routes/cartRecoveryRoutes'));

const express = require('express');
const router = express.Router();

let recovery;
try { recovery = require('../lib/commerce/cartRecovery'); } catch { recovery = null; }

function ensure(res) {
  if (!recovery) { res.status(503).json({ ok: false, error: 'Cart recovery not available' }); return false; }
  return true;
}

// Stats.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: recovery.stats() });
});

// Update config. Body: { idleMinutes?, maxAttempts?, gapHours?, message? }
router.post('/config', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, config: recovery.configure(req.body || {}) });
});

// Manual sweep (testing).
router.post('/sweep', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await recovery.sweep() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
