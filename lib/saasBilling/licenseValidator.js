// lib/saasBilling/licenseValidator.js — Pure functions to evaluate license validity.
// No side effects, no persistence. Used by licenseEngine + featureGate + doctor.

const STATUSES = ['trial', 'active', 'past_due', 'grace', 'suspended', 'cancelled', 'expired', 'lifetime'];

function nowMs() { return Date.now(); }
function ms(date) { const t = Date.parse(date); return Number.isFinite(t) ? t : null; }

// Derive the effective status from dates + stored status, without mutating anything.
function effectiveStatus(license, refNow = nowMs()) {
  if (!license) return 'expired';
  if (license.status === 'lifetime') return 'lifetime';
  if (license.status === 'cancelled') return 'cancelled';
  if (license.status === 'suspended') return 'suspended';

  const trialEnds = ms(license.trialEndsAt);
  const expires = ms(license.expiresAt);
  const graceEnds = ms(license.graceEndsAt);

  if (license.status === 'trial') {
    if (trialEnds && refNow > trialEnds) {
      if (graceEnds && refNow <= graceEnds) return 'grace';
      return 'past_due';
    }
    return 'trial';
  }
  if (expires && refNow > expires) {
    if (graceEnds && refNow <= graceEnds) return 'grace';
    return 'expired';
  }
  return license.status || 'active';
}

// Is the license currently entitled to use paid features?
function isEntitled(license, refNow = nowMs()) {
  const s = effectiveStatus(license, refNow);
  return ['trial', 'active', 'grace', 'lifetime'].includes(s);
}

function summarize(license, refNow = nowMs()) {
  const status = effectiveStatus(license, refNow);
  return {
    status,
    entitled: isEntitled(license, refNow),
    expired: status === 'expired',
    inGrace: status === 'grace',
    inTrial: status === 'trial',
  };
}

module.exports = { STATUSES, effectiveStatus, isEntitled, summarize };
