// lib/saasBilling/safetyGuard.js — Central safety posture for the billing layer.
// Every enforcement / payment / suspension decision routes through here so the
// default posture stays warn-only and dry-run, and so the doctor can report it.

const { config } = require('./config');

// Routes that must NEVER be blocked even when live enforcement is enabled.
const PROTECTED_PATH_FRAGMENTS = [
  'login', 'logout', 'auth', 'billing', 'invoice', 'export', 'support',
  'admin', 'safety', 'doctor', 'health', 'saas-billing',
];

function isProtectedAction(actionOrPath) {
  const s = String(actionOrPath || '').toLowerCase();
  return PROTECTED_PATH_FRAGMENTS.some((f) => s.includes(f));
}

// Should a limit/feature decision actually BLOCK, or just warn?
function shouldBlock(actionOrPath) {
  if (!config.effective.liveEnforcement) return false;     // warn-only / dry-run
  if (isProtectedAction(actionOrPath)) return false;        // never block critical paths
  return true;
}

function canSuspendTenant() {
  return config.effective.liveSuspension; // false unless explicitly opted in
}

function canAutoVerifyPayment() {
  return config.effective.liveAutoVerify; // false unless verifier + opt-in
}

function canWritePlans() {
  return config.effective.planWrite;
}

// A snapshot of the current safety posture for doctor/status responses.
function posture() {
  return {
    enabled: config.enabled,
    dryRun: config.dryRun,
    warnOnly: config.warnOnly,
    enforceLimits: config.enforceLimits,
    requireAdmin: config.requireAdmin,
    liveEnforcement: config.effective.liveEnforcement,
    liveSuspension: config.effective.liveSuspension,
    liveAutoVerify: config.effective.liveAutoVerify,
    planWriteAllowed: config.effective.planWrite,
  };
}

module.exports = { isProtectedAction, shouldBlock, canSuspendTenant, canAutoVerifyPayment, canWritePlans, posture };
