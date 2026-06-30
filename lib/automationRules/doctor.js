// lib/automationRules/doctor.js — Offline self-check + posture snapshot. Probes which target
// departments are wired so the operator can see what actions will actually do something.

const { config, KNOWN_EVENTS, ACTION_TYPES } = require('./config');
const store = require('./store');
const { matches } = require('./conditionMatcher');

function _present(name) { try { require('../' + name); return true; } catch (_e) { return false; } }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.rules) && Array.isArray(d.runs));
 ok('condition_no_eval', matches({ event: 'x', amount: 10 }, { all: [{ field: 'amount', op: 'gt', value: 5 }] }) === true && matches({ event: 'x', amount: 1 }, { all: [{ field: 'amount', op: 'gt', value: 5 }] }) === false, 'JSON conditions evaluate (no eval)');
 const deps = { contacts: _present('contacts'), consentCenter: _present('consentCenter'), dripCampaigns: _present('dripCampaigns'), teamRouting: _present('teamRouting'), alertCenter: _present('alertCenter'), analytics: _present('analytics'), customer360: _present('customer360'), templateLibrary: _present('templateLibrary'), messageScheduler: _present('messageScheduler'), apiGateway: _present('apiGateway') };
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, dryRun: config.dryRun, knownEvents: KNOWN_EVENTS, actionTypes: ACTION_TYPES, wiredDepartments: Object.entries(deps).filter(([, v]) => v).map(([k]) => k) },
 counts: { rules: d.rules.length, runs: d.runs.length },
 checks,
 };
}

module.exports = { run };
