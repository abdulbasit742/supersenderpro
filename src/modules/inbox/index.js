 'use strict';


 /**
  * Inbox module — REST API + /inbox page.
  *   POST /api/inbox/ingest                          inbound message (from channel webhooks)
  *      GET   /api/inbox/conversations               list (optional ?status= &channel=)
  *      GET   /api/inbox/conversations/:id           full thread (marks read)
  *      POST /api/inbox/conversations/:id/reply      send reply { text, agent }
  *      POST /api/inbox/conversations/:id/note       internal note { text, agent }
  *      POST /api/inbox/conversations/:id/assign     { assignee }
  *      POST /api/inbox/conversations/:id/status     { status }
  *      GET /api/inbox/canned                        list canned replies
  *      POST /api/inbox/canned                       create canned reply
  *      DELETE /api/inbox/canned/:id                 delete canned reply
  *      GET /inbox                                   dashboard page
  */


 const inboxStore = require('./inboxStore');
 const inbox = require('./inbox');
 const canned = require('./cannedReplies');
 const renderInbox = require('./inbox.page');

 function register(app) {
      app.post('/api/inbox/ingest', (req, res) => {
        const r = inbox.ingest(req.body || {});
        res.status(r.ok ? 200 : 400).json(r);
      });


      app.get('/api/inbox/conversations', (req, res) => {
        let all = inboxStore.list();
        if (req.query.status) all = all.filter((c) => c.status === req.query.status);
        if (req.query.channel) all = all.filter((c) => c.channel === req.query.channel);
        all = all.slice().sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
        res.json({ ok: true, summary: inboxStore.summary(), conversations: all });
      });

      app.get('/api/inbox/conversations/:id', (req, res) => {
        const conv = inboxStore.get(req.params.id);
        if (!conv) return res.status(404).json({ ok: false, error: 'not found' });
        inbox.markRead(req.params.id);
        res.json({ ok: true, conversation: conv });
      });

      app.post('/api/inbox/conversations/:id/reply', async (req, res) => {
        const b = req.body || {};
        const r = await inbox.reply(req.params.id, b.text || '', b.agent);
        res.status(r.ok ? 200 : 400).json(r);
      });

    app.post('/api/inbox/conversations/:id/note', (req, res) => {
      const b = req.body || {};
      const r = inbox.addNote(req.params.id, b.text || '', b.agent);
      res.status(r.ok ? 200 : 400).json(r);
    });

    app.post('/api/inbox/conversations/:id/assign', (req, res) => {
      const r = inbox.assign(req.params.id, (req.body || {}).assignee);
      res.status(r.ok ? 200 : 400).json(r);
    });

    app.post('/api/inbox/conversations/:id/status', (req, res) => {
      const r = inbox.setStatus(req.params.id, (req.body || {}).status);
      res.status(r.ok ? 200 : 400).json(r);
    });


    app.get('/api/inbox/canned', (req, res) => res.json({ ok: true, replies: canned.list() }));
    app.post('/api/inbox/canned', (req, res) => {
      const r = canned.create(req.body || {});
      res.status(r.ok ? 200 : 400).json(r);
    });
    app.delete('/api/inbox/canned/:id', (req, res) => {
      const r = canned.remove(req.params.id);
      res.status(r.ok ? 200 : 404).json(r);
    });


    app.get('/inbox', (req, res) => res.type('html').send(renderInbox()));
}


module.exports = { register };
