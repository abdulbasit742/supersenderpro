 'use strict';
 /**
  * routes/supportHelpdeskRoutes.js
  * Express Router for the Support Helpdesk + Knowledge Base Center.
  * No live message/email sending, no external AI by default, no secrets/full PII in responses.
  * Write routes are local/dry-run safe. Does not crash if data files are missing.
  */
 const express = require('express');
 const router = express.Router();

 const tickets = require('../lib/supportHelpdesk/ticketRegistry');
 const classifier = require('../lib/supportHelpdesk/ticketClassifier');
 const kb = require('../lib/supportHelpdesk/knowledgeBase');
 const drafts = require('../lib/supportHelpdesk/supportDrafts');
 const escalation = require('../lib/supportHelpdesk/escalationRules');
 const sla = require('../lib/supportHelpdesk/slaTracker');
 const safety = require('../lib/supportHelpdesk/safetyGuard');
 const ownerSummary = require('../lib/supportHelpdesk/adapters/ownerCommandSummary');
 const pilotOps = require('../lib/supportHelpdesk/adapters/pilotOpsAdapter');
 const store = require('../lib/supportHelpdesk/store');

 const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
 const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });

 // seed KB defaults on first touch
 kb.seedDefaults();

 router.get('/status', (req, res) => {
   const t = tickets.list();
   ok(res, {
     enabled: String(process.env.SUPPORT_HELPDESK_ENABLED || 'true') === 'true',
       dryRun: safety.globalDryRun(), liveReplies: safety.allowLiveReplies(), aiLive: safety.aiLive(),
       counts: {
        open: t.filter((x) => !['resolved', 'archived'].includes(x.status)).length,
        urgent: t.filter((x) => ['high', 'critical'].includes(x.priority)).length,
        waitingCustomer: t.filter((x) => x.status === 'waiting_customer').length,
        waitingAdmin: t.filter((x) => x.status === 'waiting_admin').length,
        escalated: t.filter((x) => x.status === 'escalated').length,
        kbArticles: kb.list().length,
     },
   });
 });

 // tickets
 router.get('/tickets', (req, res) => ok(res, { tickets: tickets.list(req.query) }));
 router.post('/tickets', (req, res) => { const r = tickets.create(req.body || {}); return r.ok ? ok(res, { ticket:
 r.ticket }) : bad(res, 400, r.errors); });
 router.get('/tickets/:id', (req, res) => { const t = tickets.get(req.params.id); return t ? ok(res, { ticket: t }) :
 bad(res, 404, ['not_found']); });

router.put('/tickets/:id', (req, res) => { const r = tickets.update(req.params.id, req.body || {}); return r.ok ? ok(res,
{ ticket: r.ticket }) : bad(res, 400, r.errors); });
router.post('/tickets/:id/classify', (req, res) => { const t = tickets.get(req.params.id); if (!t) return bad(res, 404,
['not_found']); const c = classifier.classify(t.title + ' ' + t.descriptionSafe); tickets.update(t.id, { category:
c.category, sentiment: c.sentiment }); ok(res, { classification: c }); });
router.post('/tickets/:id/summary', (req, res) => { const t = tickets.get(req.params.id); if (!t) return bad(res, 404,
['not_found']); const d = drafts.build(t); tickets.update(t.id, { aiSummary: d.internalSummary }); ok(res, { summary:
d.internalSummary, related: d.relatedArticles }); });
router.post('/tickets/:id/reply-draft', (req, res) => { const t = tickets.get(req.params.id); if (!t) return bad(res,
404, ['not_found']); const d = drafts.build(t, req.body || {}); tickets.update(t.id, { suggestedReply: d.shortReply });
ok(res, { draft: d }); });
router.post('/tickets/:id/escalate', (req, res) => { const t = tickets.get(req.params.id); if (!t) return bad(res, 404,
['not_found']); const e = escalation.evaluate(t); tickets.update(t.id, { status: 'escalated', escalationRequired: true
}); ok(res, { escalation: e, sla: sla.track(t) }); });
router.post('/tickets/:id/resolve', (req, res) => { const r = tickets.setStatus(req.params.id, 'resolved'); return r.ok ?
ok(res, { ticket: r.ticket }) : bad(res, 404, r.errors); });
router.post('/tickets/:id/archive', (req, res) => { const r = tickets.setStatus(req.params.id, 'archived'); return r.ok ?
ok(res, { ticket: r.ticket }) : bad(res, 404, r.errors); });


// knowledge base
router.get('/kb', (req, res) => ok(res, { articles: kb.list(req.query) }));
router.post('/kb', (req, res) => { const r = kb.upsert(req.body || {}); return r.ok ? ok(res, { article: r.article }) :
bad(res, 400, r.errors); });
router.get('/kb/:id', (req, res) => { const a = kb.get(req.params.id); return a ? ok(res, { article: a }) : bad(res, 404,
['not_found']); });
router.put('/kb/:id', (req, res) => { const r = kb.upsert(Object.assign({ id: req.params.id }, req.body || {})); return
r.ok ? ok(res, { article: r.article }) : bad(res, 400, r.errors); });
router.post('/kb/search', (req, res) => ok(res, { results: kb.search((req.body && req.body.query) || '', req.body || {})
}));
router.post('/kb/:id/review', (req, res) => { const r = kb.review(req.params.id); return r.ok ? ok(res, { article:
r.article }) : bad(res, 404, r.errors); });

// reports
router.get('/dashboard', (req, res) => ok(res, { owner: ownerSummary.summary(), pilot: pilotOps.summary() }));
router.get('/history', (req, res) => ok(res, { history: store.readHistory(Number(req.query.limit) || 200) }));
router.get('/doctor', (req, res) => { const t = tickets.list(); ok(res, { dryRun: safety.globalDryRun(), liveReplies:
safety.allowLiveReplies(), slaOverdue: t.filter((x) => sla.track(x).overdue).length, kbArticles: kb.list().length,
nextSteps: ['Keep live replies off until reviewed', 'Review unresolved escalations'] }); });
router.post('/report/generate', (req, res) => { const t = tickets.list(); ok(res, { report: { total: t.length,
byCategory: t.reduce((a, x) => (a[x.category] = (a[x.category] || 0) + 1, a), {}), bugs: t.filter((x) => x.category ===
'bug').length, featureRequests: t.filter((x) => x.category === 'feature_request').length } }); });

// public contact form -> local ticket preview only (consent required, no live send)
router.post('/public/contact', (req, res) => {
  const b = req.body || {};
  if (safety.requireConsent() && b.consent !== true) return bad(res, 400, ['consent_required']);
  const r = tickets.create(Object.assign({ sourceType: 'public_funnel' }, b));
  ok(res, { ticketId: r.ticket.id, dryRun: true, note: 'Local ticket preview created. No email/WhatsApp sent.' });
});

module.exports = router;
