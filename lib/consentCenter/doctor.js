// lib/consentCenter/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const keywords = require('./keywords');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', d.consent && typeof d.consent === 'object' && Array.isArray(d.log));
 ok('stop_detected', keywords.classify('STOP') === 'opt_out', 'STOP classified as opt-out');
 ok('roman_urdu_stop', keywords.classify('band karo') === 'opt_out', 'Roman-Urdu band karo classified as opt-out');
 ok('start_detected', keywords.classify('START') === 'opt_in', 'START classified as opt-in');
 ok('non_command_ignored', keywords.classify('non-stop delivery please') === null, 'non-command message not treated as opt-out');
 let contacts = false; try { require('../contacts'); contacts = true; } catch (_e) { contacts = false; }
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, model: config.allowUnknownConsent ? 'opt-out' : 'opt-in', contactsSync: contacts, stopKeywords: config.stopKeywords.length, startKeywords: config.startKeywords.length },
 counts: { tracked: Object.keys(d.consent).length, optedOut: Object.values(d.consent).filter((v) => v.status === 'opted_out').length },
 checks,
 };
}

module.exports = { run };
