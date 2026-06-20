// lib/saasBilling/doctor.js — Health + safety self-check for the billing layer.
// Returns { score, status, blockers, warnings, nextSteps, checks }. Never exposes secrets.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { config } = require('./config');
const safetyGuard = require('./safetyGuard');
const planRegistry = require('./planRegistry');
const licenseStore = require('./licenseStore');
const usageStore = require('./usageStore');
const paymentAdapters = require('./paymentAdapters');
const { hasLeak } = require('./privacy');

function exists(rel) { try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; } }
function readSafe(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } }

function run() {
  const checks = [];
  const blockers = [];
  const warnings = [];
  const nextSteps = [];
  const add = (name, ok, level, detail = '') => {
    checks.push({ name, ok: !!ok, level, detail });
    if (!ok && level === 'blocker') blockers.push(name);
    if (!ok && level === 'warning') warnings.push(name);
  };

  // Structural
  add('billing enabled', config.enabled, 'warning', `enabled=${config.enabled}`);
  add('dry-run default on', config.dryRun, 'warning', `dryRun=${config.dryRun}`);
  add('warn-only default on', config.warnOnly, 'warning', `warnOnly=${config.warnOnly}`);
  add('route module present', exists('routes/saasBillingRoutes.js'), 'blocker');
  add('server hook present', exists('server.js') && readSafe('server.js').includes('SAAS BILLING HOOK'), 'warning');
  add('dashboard page present', exists('public/saas-billing.html'), 'warning');
  add('env placeholders present', readSafe('.env.example').includes('SAAS_BILLING_ENABLED'), 'warning');

  // Data layer
  let plans = [];
  try { plans = planRegistry.getPlans(); } catch (_e) { /* ignore */ }
  add('plans exist', plans.length > 0, 'blocker', `${plans.length} plans`);
  add('default plans seeded', plans.some((p) => p.id === 'free_trial') && plans.some((p) => p.id === 'pro'), 'warning');
  let licenseOk = true; try { licenseStore.all(); } catch (_e) { licenseOk = false; }
  add('license store works', licenseOk, 'blocker');
  let usageOk = true; try { usageStore.all(); } catch (_e) { usageOk = false; }
  add('usage store works', usageOk, 'blocker');

  // Payment posture
  const adapters = paymentAdapters.statusAll();
  const usable = paymentAdapters.hasUsableProvider();
  add('payment provider configured or manual mode', usable, 'warning', `manual always available; ${adapters.filter((a) => a.configured).length} configured`);

  // Safety invariants
  add('no live suspension without explicit opt-in', !config.effective.liveSuspension || config.allowLiveSuspension, 'blocker');
  add('no auto-verify without verifier + opt-in', !config.effective.liveAutoVerify || (config.autoVerifyPayments && adapters.some((a) => a.status === 'existing_module_detected')), 'blocker');
  if (config.effective.liveEnforcement && !config.requireAdmin) {
    add('admin auth required when enforcing', false, 'blocker', 'live enforcement on but SAAS_BILLING_REQUIRE_ADMIN=false');
  } else {
    add('admin auth required when enforcing', true, 'warning');
  }

  // Secret leak guard on a sample payload
  let leak = false;
  try { leak = hasLeak(JSON.stringify({ plans, posture: safetyGuard.posture() })); } catch (_e) { leak = false; }
  add('no secrets exposed in sample payload', !leak, 'blocker');

  // Next steps
  if (!exists('routes/saasBillingRoutes.js')) nextSteps.push('Mount routes/saasBillingRoutes.js in server.js.');
  if (config.effective.liveEnforcement) nextSteps.push('Live enforcement is ON — verify protected routes are excluded.');
  if (!adapters.some((a) => a.configured || a.status === 'existing_module_detected')) nextSteps.push('Configure a payment provider or rely on manual review.');
  nextSteps.push('Keep SAAS_BILLING_DRY_RUN=true and WARN_ONLY=true until ready to enforce.');

  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const status = blockers.length ? 'blocked' : (warnings.length ? 'warn' : 'healthy');

  return { generatedAt: new Date().toISOString(), score, status, passed, total: checks.length, blockers, warnings, nextSteps, posture: safetyGuard.posture(), paymentAdapters: adapters, checks };
}

module.exports = { run };
