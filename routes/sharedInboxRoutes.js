 'use strict';
 /**
  * routes/sharedInboxRoutes.js
  * Shared Inbox 2.0 API. Reply is preview/draft only (no live send). No external calls,
  * no secrets, masked PII. Every handler catches errors; never leaks stack traces.
  */
 const express = require('express');
 const router = express.Router();
 const conversations = require('../lib/sharedInbox/conversationService');
 const assignment = require('../lib/sharedInbox/assignmentService');
 const notes = require('../lib/sharedInbox/privateNotes');
 const savedReplies = require('../lib/sharedInbox/savedReplies');
 const collision = require('../lib/sharedInbox/collisionGuard');
 const replyPreview = require('../lib/sharedInbox/replyPreview');
 const adapter = require('../lib/sharedInbox/inboxAdapter');

 const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
 const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });
 function safe(handler) { return (req, res) => { try { handler(req, res); } catch (e) { res.status(200).json({ ok: false,
 error: 'handler_error', message: 'Something went wrong; no action taken.' }); } }; }

 router.get('/status', safe((req, res) => ok(res, {
   module: 'shared-inbox', status: 'available', dryRun: true, liveActionsEnabled: false,
   reusesOmnichannelInbox: adapter.available(), warnings: [], blockers: [], timestamp: new Date().toISOString(),
 })));

 router.get('/conversations', safe((req, res) => ok(res, conversations.list())));
 router.get('/conversations/:id', safe((req, res) => { const r = conversations.get(req.params.id); return r.ok ? ok(res,
 r) : bad(res, 404, r.errors); }));
 router.post('/conversations/:id/assign', safe((req, res) => { const r = assignment.assign(req.params.id, (req.body ||
 {}).agentId); return r.ok ? ok(res, r) : bad(res, 400, r.errors); }));
 router.post('/conversations/:id/status', safe((req, res) => { const r = conversations.setStatus(req.params.id, (req.body
 || {}).status); return r.ok ? ok(res, r) : bad(res, 400, r.errors); }));
 router.post('/conversations/:id/priority', safe((req, res) => { const r = conversations.setPriority(req.params.id,
 (req.body || {}).priority); return r.ok ? ok(res, r) : bad(res, 400, r.errors); }));

 router.get('/conversations/:id/notes', safe((req, res) => ok(res, notes.list(req.params.id))));
 router.post('/conversations/:id/notes', safe((req, res) => { const b = req.body || {}; const r = notes.add(req.params.id,
 b.agentId, b.text); return r.ok ? ok(res, r) : bad(res, 400, r.errors); }));

 router.get('/saved-replies', safe((req, res) => ok(res, savedReplies.list())));
 router.post('/saved-replies', safe((req, res) => { const r = savedReplies.add(req.body || {}); return r.ok ? ok(res, r) :
 bad(res, 400, r.errors); }));

 router.post('/reply-preview', safe((req, res) => ok(res, replyPreview.build(req.body || {}))));
 router.post('/collision/check', safe((req, res) => { const b = req.body || {}; return ok(res,
 collision.check(b.conversationId, b.agentId)); }));
 router.post('/collision/acquire', safe((req, res) => { const b = req.body || {}; return ok(res,
 collision.acquire(b.conversationId, b.agentId)); }));

router.post('/collision/release', safe((req, res) => { const b = req.body || {}; return ok(res,
collision.release(b.conversationId, b.agentId)); }));

module.exports = router;
