// routes/ownerDashboardRoutes.js — Analytics #1: owner dashboard.
//
// Wire-up (server.js) — connect each department's summary fn, then mount:
//   const dash = require('./lib/analytics/ownerDashboard');
//   dash.configure({
//     leads:     () => require('./lib/leads/leadCapture').stats(),
//     crm:       () => { const ps = require('./lib/crm/customer360').listProfiles();
//                        return { customers: ps.filter(p=>p.stage==='customer').length,
//                                 totalSpent: ps.reduce((s,p)=>s+(p.stats?.totalSpent||0),0) }; },
//     pipeline:  () => require('./lib/crm/salesPipeline').forecast(),
//     marketing: () => require('./lib/marketing/campaignAnalytics').overview(),
//     payments:  () => { /* summarise subscriptions: active/pastDue + revenue */ return {}; }
//   });
//   app.use('/api/analytics/dashboard', require('./routes/ownerDashboardRoutes'));

const express = require('express');
const router = express.Router();

let dash;
try { dash = require('../lib/analytics/ownerDashboard'); } catch { dash = null; }

router.get('/', (req, res) => {
  if (!dash) return res.status(503).json({ ok: false, error: 'Dashboard not available' });
  try { res.json({ ok: true, dashboard: dash.getDashboard() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
