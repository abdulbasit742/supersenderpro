// developerPortal/webhookSubscriptions.js — subscription manager (preview-safe).
// Stores masked URL + signing secret hash/preview only. Default delivery mode is dry_run.
const crypto = require('crypto');
const store = require('./store');
const { validate } = require('./webhookValidator');
const { newSecret } = require('./webhookSigning');
const { maskUrl } = require('./redactor');
const { policy } = require('./safetyGuard');

const DELIVERY_MODES = ['disabled','dry_run','manual_test_only','live_disabled_by_policy'];

function load(){ return store.read(store.PATHS.webhooks(), { subscriptions: [], _secrets: {} }); }
function save(d){ return store.write(store.PATHS.webhooks(), d); }
function scrub(s){ const { _fullUrl, ...rest } = s; return rest; }

function listSubs(){ return load().subscriptions.map(scrub); }
function getSub(id){ const s = load().subscriptions.find(x=>x.id===id); return s?scrub(s):null; }

function createSub(input={}){
  const v = validate(input);
  if (!v.valid) { const e = new Error('Validation failed: '+v.errors.join('; ')); e.validation=v; throw e; }
  const d = load();
  const sec = newSecret();
  const live = policy().allowLiveWebhooks && !policy().dryRun;
  const sub = {
    id: 'whsub_' + crypto.randomBytes(8).toString('hex'),
    appId: input.appId || null,
    urlMasked: maskUrl(input.url),
    eventTypes: input.eventTypes,
    status: 'active_preview',
    signingSecretPreview: sec.preview,
    signingSecretHash: sec.hash,
    deliveryMode: live ? 'manual_test_only' : 'dry_run',
    dryRun: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // _fullUrl kept ONLY in local store (gitignored), never returned by API
    _fullUrl: input.url,
  };
  // store the raw signing secret separately in local-only map for preview signing; never exposed
  d._secrets = d._secrets || {};
  d._secrets[sub.id] = sec.raw;
  d.subscriptions.push(sub); save(d);
  store.appendHistory({ type:'webhook_subscription_created', subscriptionId: sub.id });
  return scrub(sub);
}

function updateSub(id, updates={}){
  const d = load(); const s = d.subscriptions.find(x=>x.id===id); if(!s) return null;
  if (updates.eventTypes) s.eventTypes = updates.eventTypes;
  if (updates.status) s.status = updates.status;
  if (updates.deliveryMode && DELIVERY_MODES.includes(updates.deliveryMode)){
    // never allow elevation to a live mode unless policy permits
    const live = policy().allowLiveWebhooks && !policy().dryRun;
    s.deliveryMode = (!live && updates.deliveryMode!=='disabled') ? 'dry_run' : updates.deliveryMode;
  }
  s.updatedAt = new Date().toISOString();
  save(d); store.appendHistory({ type:'webhook_subscription_updated', subscriptionId:id });
  return scrub(s);
}

// internal helpers (not exported to API): get raw secret + full url for preview signing/simulation
function _internal(id){ const d=load(); const s=d.subscriptions.find(x=>x.id===id); if(!s) return null; return { sub:s, secret:(d._secrets||{})[id], fullUrl:s._fullUrl }; }

module.exports = { DELIVERY_MODES, listSubs, getSub, createSub, updateSub, _internal };
