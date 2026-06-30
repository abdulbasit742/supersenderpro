// routes/walletRoutes.js
// Mount: app.use('/api/wallet', require('./routes/walletRoutes').default(deps))
// or ESM: import walletRoutes from './routes/walletRoutes.js'; app.use('/api/wallet', walletRoutes());
// Tenant resolved from req.tenantId (set by existing auth middleware) with header fallback.

import express from 'express';
import wallet from '../lib/commerce/wallet.js';

export default function walletRoutes() {
  const router = express.Router();

  const tenant = (req) => req.tenantId || req.headers['x-tenant-id'];

  router.get('/:contactId/balance', (req, res) => {
    try {
      res.json({ ok: true, balance: wallet.getBalance(tenant(req), req.params.contactId) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post('/:contactId/credit', (req, res) => {
    try {
      const bal = wallet.credit(tenant(req), req.params.contactId, req.body.amount, req.body.meta);
      res.json({ ok: true, balance: bal });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post('/:contactId/debit', (req, res) => {
    try {
      const bal = wallet.debit(tenant(req), req.params.contactId, req.body.amount, req.body.meta);
      res.json({ ok: true, balance: bal });
    } catch (e) {
      const code = e.code === 'INSUFFICIENT_FUNDS' ? 402 : 400;
      res.status(code).json({ ok: false, error: e.message, balance: e.balance });
    }
  });

  router.post('/:contactId/apply-to-order', (req, res) => {
    try {
      res.json({ ok: true, ...wallet.applyToOrder(tenant(req), req.params.contactId, req.body.orderTotal, req.body.meta) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get('/:contactId/ledger', (req, res) => {
    try {
      res.json({ ok: true, ledger: wallet.ledger(tenant(req), req.params.contactId, Number(req.query.limit) || 50) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  return router;
}
