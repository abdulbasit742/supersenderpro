// developerPortal/developerRegistry.js — Developer App registry (preview-safe CRUD).
const crypto = require('crypto');
const store = require('./store');
const { filterValid } = require('./scopes');
const { generatePreview } = require('./apiKeys');
const { policy } = require('./safetyGuard');
const { maskUrl } = require('./redactor');

const OWNER_TYPES = ['admin','reseller','agency','tenant','system','developer','unknown'];
const APP_TYPES = ['internal','reseller_app','agency_app','n8n','zapier_style','make_style','custom_crm','custom_analytics','custom_dashboard','ecommerce_connector','support_connector','generic'];
const STATUSES = ['draft','active_preview','disabled','revoked_preview','archived'];

function load(){ return store.read(store.PATHS.apps(), { apps: [] }); }
function save(d){ return store.write(store.PATHS.apps(), d); }

function listApps(){ return load().apps.map(scrub); }
function getApp(id){ const a = load().apps.find(x=>x.id===id); return a?scrub(a):null; }

function scrub(a){ const { apiKeyHash, ...rest } = a; return rest; } // never expose hash externally

function createApp(input={}){
  const d = load();
  const app = {
    id: 'app_' + crypto.randomBytes(8).toString('hex'),
    name: String(input.name||'Untitled App').slice(0,80),
    ownerType: OWNER_TYPES.includes(input.ownerType)?input.ownerType:'unknown',
    ownerIdSafe: input.ownerIdSafe ? String(input.ownerIdSafe).slice(0,40) : 'anon',
    appType: APP_TYPES.includes(input.appType)?input.appType:'generic',
    status: 'draft',
    scopes: filterValid(input.scopes),
    apiKeyPreview: null,
    apiKeyHash: null,
    webhookUrlMasked: input.webhookUrl ? maskUrl(input.webhookUrl) : null,
    allowedEvents: Array.isArray(input.allowedEvents)?input.allowedEvents.slice(0,50):[],
    rateLimitTier: input.rateLimitTier || 'free',
    dryRun: policy().dryRun !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  d.apps.push(app); save(d);
  store.appendHistory({ type:'app_created', appId: app.id, appType: app.appType });
  return scrub(app);
}

function updateApp(id, updates={}){
  const d = load(); const a = d.apps.find(x=>x.id===id); if(!a) return null;
  if (updates.name) a.name = String(updates.name).slice(0,80);
  if (updates.scopes) a.scopes = filterValid(updates.scopes);
  if (updates.status && STATUSES.includes(updates.status)) a.status = updates.status;
  if (updates.appType && APP_TYPES.includes(updates.appType)) a.appType = updates.appType;
  if (updates.allowedEvents) a.allowedEvents = updates.allowedEvents.slice(0,50);
  if (updates.rateLimitTier) a.rateLimitTier = updates.rateLimitTier;
  if (updates.webhookUrl) a.webhookUrlMasked = maskUrl(updates.webhookUrl);
  a.updatedAt = new Date().toISOString();
  save(d); store.appendHistory({ type:'app_updated', appId:id });
  return scrub(a);
}

function revokePreview(id){
  const d = load(); const a = d.apps.find(x=>x.id===id); if(!a) return null;
  a.status='revoked_preview'; a.apiKeyPreview=null; a.apiKeyHash=null; a.updatedAt=new Date().toISOString();
  save(d); store.appendHistory({ type:'app_revoked_preview', appId:id });
  return scrub(a);
}

// Generates a one-time key preview. Persists only hash+masked preview, never the raw key.
function issueKeyPreview(id){
  const d = load(); const a = d.apps.find(x=>x.id===id); if(!a) return null;
  const k = generatePreview(id);
  a.apiKeyPreview = k.apiKeyPreview; a.apiKeyHash = k.apiKeyHash;
  if (a.status==='draft') a.status='active_preview';
  a.updatedAt = new Date().toISOString();
  save(d); store.appendHistory({ type:'api_key_preview_issued', appId:id, isDemo:k.isDemo });
  return { app: scrub(a), isDemo:k.isDemo, oneTimeKey:k.oneTimeKey, note:k.note }; // oneTimeKey shown once
}

module.exports = { OWNER_TYPES, APP_TYPES, STATUSES, listApps, getApp, createApp, updateApp, revokePreview, issueKeyPreview };
