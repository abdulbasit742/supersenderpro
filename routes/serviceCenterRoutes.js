// routes/serviceCenterRoutes.js
// Express router for the Service Center. All GET/preview. Error-wrapped, no stack leaks.
'use strict';


const express = require('express');
const router = express.Router();


const workOrders = require('../lib/serviceCenter/workOrderService');
const jobCards = require('../lib/serviceCenter/jobCardService');
const dispatch = require('../lib/serviceCenter/technicianDispatchPreview');
const diagnosis = require('../lib/serviceCenter/diagnosisPreview');
const partsReq = require('../lib/serviceCenter/partsRequirementPreview');
const labor = require('../lib/serviceCenter/laborCostPreview');
const profit = require('../lib/serviceCenter/serviceProfitability');
const approval = require('../lib/serviceCenter/customerApprovalPreview');
const invImpact = require('../lib/serviceCenter/inventoryImpactPreview');
const acctImpact = require('../lib/serviceCenter/accountingImpactPreview');
const messages = require('../lib/serviceCenter/messageDrafts');

// Wrap each handler so errors return clean JSON, never a stack trace.
function safe(fn) {
    return (req, res) => {
      try {
          const out = fn(req);
          if (out && out.ok === false) return res.status(400).json(out);
        return res.json(out);
      } catch (e) {
          return res.status(500).json({ ok: false, error: 'service_center_error', message: 'Request could not be processed.'
});
      }
    };
}

// Health + flags
router.get('/health', safe(() => ({ ok: true, feature: 'service-center', mode: 'preview', dryRun: workOrders.FLAGS.dryRun
})));
router.get('/flags', safe(() => ({ ok: true, workOrders: workOrders.FLAGS, jobCards: jobCards.FLAGS, dispatch:
dispatch.FLAGS, approval: approval.FLAGS, inventory: invImpact.FLAGS, accounting: acctImpact.FLAGS, messages:
messages.FLAGS })));

// Work orders
router.get('/work-orders', safe((req) => ({ ok: true, items: workOrders.list(req.query) })));
router.get('/work-orders/:id', safe((req) => { const wo = workOrders.get(req.params.id); return wo ? { ok: true,
workOrder: wo } : { ok: false, errors: ['not found'] }; }));
router.post('/work-orders/preview', express.json(), safe((req) => workOrders.createPreview(req.body || {})));
router.post('/work-orders/:id/transition-preview', express.json(), safe((req) =>
workOrders.transitionPreview(req.params.id, (req.body || {}).to)));
router.get('/sla', safe(() => ({ ok: true, sla: workOrders.slaSummary() })));


// Job cards
router.get('/job-cards', safe((req) => ({ ok: true, items: jobCards.list(req.query) })));
router.get('/job-cards/:id', safe((req) => { const jc = jobCards.get(req.params.id); return jc ? { ok: true, jobCard: jc
} : { ok: false, errors: ['not found'] }; }));
router.post('/job-cards/preview', express.json(), safe((req) => jobCards.createPreview(req.body || {})));
router.post('/job-cards/:id/complete-preview', safe((req) => jobCards.completePreview(req.params.id)));


// Dispatch
router.get('/dispatch/board', safe(() => ({ ok: true, board: dispatch.boardLoad() })));
router.get('/dispatch/suggest/:woId', safe((req) => dispatch.suggest(req.params.woId, { all: req.query.all === 'true'
})));

// Diagnosis
router.get('/diagnosis/:woId', safe((req) => diagnosis.forWorkOrder(req.params.woId)));


// Parts + labor + profitability
router.get('/parts/:jcId', safe((req) => partsReq.forJobCard(req.params.jcId)));
router.get('/labor/:jcId', safe((req) => labor.forJobCard(req.params.jcId)));
router.get('/profitability/:woId', safe((req) => profit.forWorkOrder(req.params.woId)));
router.get('/profitability', safe(() => ({ ok: true, summary: profit.summary() })));

// Approval + impacts + messages (all preview)
router.get('/approval/:woId', safe((req) => approval.build(req.params.woId)));
router.get('/inventory-impact/:jcId', safe((req) => invImpact.forJobCard(req.params.jcId)));
router.get('/accounting-impact/:woId', safe((req) => acctImpact.forWorkOrder(req.params.woId)));
router.get('/message-draft/:event/:woId', safe((req) => messages.draft(req.params.event, req.params.woId, req.query)));


module.exports = router;
