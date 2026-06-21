'use strict';


/**
 * Pilot Ops — pilot customer registry (JSON file). PII masked at write time.
 * Never creates a real tenant. selectedPlan does NOT activate billing.
 */

const crypto = require('crypto');
const store = require('./store');
const privacy = require('./privacyGuard');
const guard = require('./safetyGuard');

const STORE_PATH = process.env.PILOT_OPS_STORE_PATH || 'data/pilot-ops.json';


const ONBOARDING_STATUSES = ['lead_created', 'demo_requested', 'trial_requested', 'onboarding_started',
'setup_in_progress', 'waiting_customer', 'waiting_admin', 'pilot_active', 'pilot_success', 'upgrade_ready',
'converted_paid', 'paused', 'cancelled', 'archived'];

function id() { return 'pilot_' + crypto.randomBytes(7).toString('hex'); }
function now() { return new Date().toISOString(); }
function read() { return store.read(STORE_PATH, { pilots: [] }); }
function write(db) { return store.write(STORE_PATH, db); }

function normalize(input) {
  const i = input || {};
  return {
    id: i.id || id(),
      leadId: i.leadId || null,
      tenantId: i.tenantId || null, // reference only; never created here
      businessName: i.businessName ? String(i.businessName).slice(0, 120) : 'Unnamed business',
      businessType: i.businessType ? String(i.businessType).slice(0, 60) : null,
      ownerNameSafe: privacy.safeName(i.ownerName || i.ownerNameSafe),
      ownerPhoneMasked: privacy.maskPhone(i.ownerPhone || i.ownerPhoneMasked),
      ownerEmailMasked: privacy.maskEmail(i.ownerEmail || i.ownerEmailMasked),
      selectedPlan: i.selectedPlan || null,
      selectedPreset: i.selectedPreset || null,
      requestedModules: Array.isArray(i.requestedModules) ? i.requestedModules.slice(0, 40) : [],
      onboardingStatus: ONBOARDING_STATUSES.indexOf(i.onboardingStatus) !== -1 ? i.onboardingStatus : 'lead_created',
      trialStatus: i.trialStatus || 'not_started',
      consentGiven: i.consentGiven === true,
      readinessScore: Number.isFinite(Number(i.readinessScore)) ? Number(i.readinessScore) : 0,
      successScore: Number.isFinite(Number(i.successScore)) ? Number(i.successScore) : 0,
      riskScore: Number.isFinite(Number(i.riskScore)) ? Number(i.riskScore) : 0,
      blockers: Array.isArray(i.blockers) ? i.blockers.slice(0, 40) : [],
      nextAction: i.nextAction ? String(i.nextAction).slice(0, 240) : null,
      dryRun: true,
      createdAt: i.createdAt || now(),

       updatedAt: now(),
     };
}


function create(input) { const db = read(); const rec = normalize(input); db.pilots.push(rec); write(db); return rec; }
function list() { return read().pilots.slice(); }
function get(pid) { return read().pilots.find(function (p) { return p.id === pid; }) || null; }
function update(pid, patch) {
  const db = read();
     const idx = db.pilots.findIndex(function (p) { return p.id === pid; });
     if (idx === -1) return null;
     const merged = Object.assign({}, db.pilots[idx], patch || {}, { id: pid, createdAt: db.pilots[idx].createdAt });
     // map raw PII fields through normalize again so nothing leaks
     if (patch && (patch.ownerName || patch.ownerPhone || patch.ownerEmail)) {
       merged.ownerName = patch.ownerName; merged.ownerPhone = patch.ownerPhone; merged.ownerEmail = patch.ownerEmail;
     }
     db.pilots[idx] = normalize(merged);
     write(db);
     return db.pilots[idx];
}
function setStatus(pid, status) {
     if (ONBOARDING_STATUSES.indexOf(status) === -1) return null;
     return update(pid, { onboardingStatus: status });
}
function statusInfo() { return { path: STORE_PATH, writable: store.writable(STORE_PATH), pilots: read().pilots.length };
}


module.exports = { ONBOARDING_STATUSES, create, list, get, update, setStatus, normalize, statusInfo };
