// lib/automationRules/actions.js — The action executors. Each maps an action spec to a call into
// ANOTHER department, which is itself already draft/advisory-safe (e.g. drip enrollment is local,
// alerts owner-delivery is draft-only, sends go through consent + sender-health upstream). Missing
// departments degrade to a 'skipped: dependency absent' result instead of throwing. When the engine
// is in dryRun, run() short-circuits BEFORE calling these, so they only run for real executions.
//
// Each executor returns { ok, detail } and never throws (errors are captured as { ok:false }).

function _req(name) { try { return require('../' + name); } catch (_e) { return null; } }

// Resolve a token from the event context (e.g. 'contact', 'amount') or a literal { value }.
function _val(spec, ctx, key) {
 if (spec[key] !== undefined) return spec[key];
 if (spec[key + 'From'] !== undefined) return ctx[spec[key + 'From']];
 return undefined;
}

const EXECUTORS = {
 add_tag(spec, ctx) {
 const cb = _req('contacts'); if (!cb) return { ok: false, skipped: 'contacts dept absent' };
 const contact = _val(spec, ctx, 'contact') || ctx.contact; const tag = _val(spec, ctx, 'tag');
 if (!contact || !tag) return { ok: false, error: 'contact and tag required' };
 const up = cb.contactStore.upsert({ phone: contact, source: 'automation' });
 cb.contactStore.addTags(up.contact.id, [String(tag)]);
 return { ok: true, detail: 'tag added: ' + tag };
 },
 set_consent(spec, ctx) {
 const cc = _req('consentCenter'); if (!cc) return { ok: false, skipped: 'consent dept absent' };
 const contact = _val(spec, ctx, 'contact') || ctx.contact; const status = _val(spec, ctx, 'status');
 if (!contact || !status) return { ok: false, error: 'contact and status required' };
 cc.consentEngine.setStatus(contact, status, 'automation');
 return { ok: true, detail: 'consent set: ' + status };
 },
 enroll_drip(spec, ctx) {
 const dc = _req('dripCampaigns'); if (!dc) return { ok: false, skipped: 'drip dept absent' };
 const contact = _val(spec, ctx, 'contact') || ctx.contact; const journeyId = _val(spec, ctx, 'journeyId');
 if (!contact || !journeyId) return { ok: false, error: 'contact and journeyId required' };
 const r = dc.enrollmentEngine.enrollManual(journeyId, { contact, name: ctx.name || '' });
 return { ok: true, detail: r.already ? 'already enrolled' : 'enrolled in ' + journeyId };
 },
 assign_agent(spec, ctx) {
 const tr = _req('teamRouting'); if (!tr) return { ok: false, skipped: 'team routing dept absent' };
 const conversationId = _val(spec, ctx, 'conversationId') || ctx.conversationId || ctx.ticket || ctx.contact;
 if (!conversationId) return { ok: false, error: 'conversationId required' };
 const r = tr.router.assign(conversationId, { skill: _val(spec, ctx, 'skill'), strategy: _val(spec, ctx, 'strategy') });
 return { ok: !!(r.assigned || r.queued), detail: r.assigned ? 'assigned to ' + r.agentId : (r.queued ? 'queued' : 'not assigned') };
 },
 async raise_alert(spec, ctx) {
 const ac = _req('alertCenter'); if (!ac) return { ok: false, skipped: 'alert center absent' };
 const event = _val(spec, ctx, 'alertEvent') || ctx.event;
 const r = await ac.emit(event, Object.assign({}, ctx, spec.payload || {}));
 return { ok: true, detail: 'alert emitted, fired ' + (r.fired ? r.fired.length : 0) };
 },
 track_event(spec, ctx) {
 const an = _req('analytics'); const c3 = _req('customer360');
 const name = _val(spec, ctx, 'name') || ('automation.' + ctx.event);
 if (an) { try { an.track({ event: name, dimensions: spec.dimensions || {} }); } catch (_e) { /* ignore */ } }
 if (c3 && (ctx.contact)) { try { c3.track({ contact: ctx.contact, type: _val(spec, ctx, 'type') || 'custom', meta: spec.meta || {} }); } catch (_e) { /* ignore */ } }
 if (!an && !c3) return { ok: false, skipped: 'analytics + customer360 absent' };
 return { ok: true, detail: 'event tracked: ' + name };
 },
 async send_template(spec, ctx) {
 const tl = _req('templateLibrary'); if (!tl) return { ok: false, skipped: 'template library absent' };
 const contact = _val(spec, ctx, 'contact') || ctx.contact; const templateId = _val(spec, ctx, 'templateId');
 if (!contact || !templateId) return { ok: false, error: 'contact and templateId required' };
 // Render only — the actual send is owned by the scheduler/broadcast path which gates consent + sender-health.
 const r = tl.renderer.render(templateId, spec.values || {}, { recordUsage: true });
 if (!r.ok) return { ok: false, error: r.reason || 'render failed' };
 const ms = _req('messageScheduler');
 if (ms) { try { ms.jobEngine.schedule({ type: 'one_off', contact, message: r.text, name: 'automation' }); return { ok: true, detail: 'template rendered + scheduled (draft-safe)' }; } catch (_e) { /* fall through */ } }
 return { ok: true, detail: 'template rendered (no scheduler to queue send)' };
 },
 schedule_message(spec, ctx) {
 const ms = _req('messageScheduler'); if (!ms) return { ok: false, skipped: 'scheduler absent' };
 const contact = _val(spec, ctx, 'contact') || ctx.contact; const message = _val(spec, ctx, 'message');
 if (!contact || !message) return { ok: false, error: 'contact and message required' };
 const job = ms.jobEngine.schedule({ type: spec.cron ? 'recurring' : 'one_off', cron: spec.cron, runAt: spec.runAt, contact, message, name: 'automation' });
 return { ok: true, detail: 'scheduled job ' + job.id };
 },
 async webhook_emit(spec, ctx) {
 const ag = _req('apiGateway'); if (!ag) return { ok: false, skipped: 'api gateway absent' };
 const event = _val(spec, ctx, 'webhookEvent') || ctx.event;
 const r = ag.webhookDispatcher.emit(event, Object.assign({}, ctx, spec.payload || {}));
 return { ok: true, detail: 'webhook queued: ' + (r.queued || 0) };
 },
};

async function execute(action, ctx) {
 const fn = EXECUTORS[action.type];
 if (!fn) return { type: action.type, ok: false, error: 'unknown action type' };
 try { const res = await fn(action, ctx || {}); return Object.assign({ type: action.type }, res); }
 catch (e) { return { type: action.type, ok: false, error: e.message }; }
}

module.exports = { execute, EXECUTORS };
