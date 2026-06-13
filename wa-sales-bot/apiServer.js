const express = require('express');
const dealerAccess = require('./bot/dealerIntelligence/dealerAccess');

function startApiServer(runtime) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'wa-sales-bot', uptime: process.uptime() });
  });

  app.get('/api/dealers', (_req, res) => {
    res.json(dealerAccess.getAllTrustedDealers());
  });

  app.get('/api/dealers/best/:toolSlug', (req, res) => {
    const result = dealerAccess.getBestDealerForTool(req.params.toolSlug);
    if (!result) return res.status(404).json({ error: 'Dealer not found for tool' });
    res.json(result);
  });

  app.get('/api/dealers/:code', (req, res) => {
    const profile = dealerAccess.getDealerProfile(req.params.code);
    if (!profile) return res.status(404).json({ error: 'Dealer not found' });
    res.json(profile);
  });

  app.get('/api/dealers/:code/rates', (req, res) => {
    res.json(dealerAccess.getDealerRates(req.params.code));
  });

  app.get('/api/dealers/:code/stock', (req, res) => {
    res.json(dealerAccess.getDealerStock(req.params.code));
  });

  const port = Number(runtime.config.apiPort || 4110);
  app.listen(port, () => {
    console.log(`🌐 Dealer API listening on http://127.0.0.1:${port}`);
  });
}

module.exports = {
  startApiServer
};
