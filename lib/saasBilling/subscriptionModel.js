'use strict';


/**
    * SaaS Billing — subscription (preview). One subscription per tenant in a JSON file.
    * No real billing; status values are *_preview.
    */

const crypto = require('crypto');
const store = require('./store');
const catalog = require('./planCatalog');

const STORE_PATH = process.env.SAAS_BILLING_STORE_PATH || 'data/saas-billing.json';
const STATUSES = ['trial_preview', 'active_preview', 'past_due_preview', 'paused_preview', 'cancelled_preview',
'expired_preview'];

function now() { return new Date().toISOString(); }
function id() { return 'sub_' + crypto.randomBytes(6).toString('hex'); }
function read() { return store.read(STORE_PATH, { subscriptions: [] }); }
function write(db) { return store.write(STORE_PATH, db); }


function zeroUsage() { const u = {}; catalog.METERS.forEach(function (m) { u[m] = 0; }); return u; }


function normalize(input) {
     const i = input || {};
     const plan = catalog.get(i.planId) || catalog.get('free_preview');
     return {
       id: i.id || id(),
         tenantId: i.tenantId ? String(i.tenantId).slice(0, 64) : 'preview',
         planId: plan.id,
         status: STATUSES.indexOf(i.status) !== -1 ? i.status : 'trial_preview',
         renewalDatePreview: i.renewalDatePreview || new Date(Date.now() + 30 * 86400000).toISOString(),
         usage: Object.assign(zeroUsage(), i.usage || {}),
         limits: Object.assign({}, plan.limits),
         dryRun: true,
         createdAt: i.createdAt || now(),
         updatedAt: now(),
     };
}


// Get (or create a default preview) subscription for a tenant.
function getForTenant(tenantId) {
     const db = read();
     const t = tenantId || 'preview';
     let sub = db.subscriptions.find(function (s) { return s.tenantId === t; });
     if (!sub) { sub = normalize({ tenantId: t, planId: 'starter_preview', status: 'active_preview', usage: {
whatsapp_messages: 1200, contacts: 800, ai_replies: 300, campaigns: 2 } }); db.subscriptions.push(sub); write(db); }
  return sub;
}

function setPlan(tenantId, planId) {
const db = read();
  const t = tenantId || 'preview';
  const idx = db.subscriptions.findIndex(function (s) { return s.tenantId === t; });
  const plan = catalog.get(planId); if (!plan) return null;
  if (idx === -1) { const sub = normalize({ tenantId: t, planId: planId }); db.subscriptions.push(sub); write(db); return
sub; }
db.subscriptions[idx] = normalize(Object.assign({}, db.subscriptions[idx], { planId: planId, limits: plan.limits }));
  write(db); return db.subscriptions[idx];
}


function addUsage(tenantId, meter, amount) {
  const db = read();
  const t = tenantId || 'preview';
  const idx = db.subscriptions.findIndex(function (s) { return s.tenantId === t; });
  if (idx === -1) { const sub = getForTenant(t); return addUsage(t, meter, amount); }
  if (catalog.METERS.indexOf(meter) === -1) return db.subscriptions[idx];
  db.subscriptions[idx].usage[meter] = (db.subscriptions[idx].usage[meter] || 0) + (Number(amount) || 0);
  db.subscriptions[idx].updatedAt = now();
  write(db);
  return db.subscriptions[idx];
}

function list() { return read().subscriptions.slice(); }
function statusInfo() { return { path: STORE_PATH, writable: store.writable(STORE_PATH), subscriptions:
read().subscriptions.length }; }


module.exports = { STATUSES, normalize, getForTenant, setPlan, addUsage, list, statusInfo, zeroUsage };
