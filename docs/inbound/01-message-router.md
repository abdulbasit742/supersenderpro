# Inbound #1: Unified Message Router (the keystone)

This is the piece that makes everything built today actually respond to real WhatsApp messages.
Everything else reacts to events; this turns a live inbound message into those events + an AI reply.

## What it does per inbound message
1. New contact -> capture as a lead (lead capture #1).
2. Record the message on the Customer 360 timeline (CRM #1).
3. Opt-out/opt-in keywords (STOP / START) -> toggle consent, skip auto-reply.
4. Emit `message_received` for the Workflow Builder.
5. Ask the AI support agent for a reply; return it (+ escalation flag).

## The wiring that activates EVERYTHING (server.js)

This single block connects today's whole build to the live WhatsApp client:

```js
const router   = require('./lib/inbound/messageRouter');
const c360     = require('./lib/crm/customer360');
const leads    = require('./lib/leads/leadCapture');
const workflow = require('./lib/workflows/workflowEngine');
const support  = require('./lib/support/aiSupportAgent');
const kb       = require('./lib/support/knowledgeBase');

// ground support answers in the KB, give support the 360 context
support.setKbLookup((q) => kb.search(q, 5));
support.setProfileFetcher((p) => c360.getProfile(p));
support.setEventEmitter((e, ctx) => workflow.emit(e, ctx));

router.configure({
  recordEvent:   (p, ev)   => c360.recordEvent(p, ev),
  upsertProfile: (p, f)    => c360.upsertProfile(p, f),
  getProfile:    (p)       => c360.getProfile(p),
  captureLead:   (payload) => leads.capture(payload),
  emit:          (e, ctx)  => workflow.emit(e, ctx),
  aiReply:       (p, t)    => support.handleMessage(p, t),
  setOptOut:     (p, on)   => c360.upsertProfile(p, { optedIn: on })
});

// hook into the WA client's inbound handler:
waClient.on('message', async (m) => {
  const phone = m.from.replace(/@c\.us$/, '');
  const { reply } = await router.handleInbound({ phone, text: m.body, name: m._data?.notifyName });
  if (reply) await waClient.sendMessage(m.from, reply);
});
```

After this, an incoming "hello" becomes: lead captured -> profile updated -> workflow fired -> AI
reply sent, all automatically.

## Note
Decoupled by injection: each capability is optional. Whatever isn't wired is simply skipped, so this
never crashes if a department is missing. JSON-backed downstream; Postgres later.
