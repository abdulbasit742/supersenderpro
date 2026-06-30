'use strict';
// #74 Referral Program — JSON-backed store. Tenant-scoped.
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'referrals.json');

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  if (!fs.existsSync(FILE)) {
    try { fs.writeFileSync(FILE, JSON.stringify({ codes: {}, referrals: [] }, null, 2)); } catch (_) {}
  }
}
function load() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (_) { return { codes: {}, referrals: [] }; }
}
function save(db) {
  ensure();
  try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); return true; } catch (_) { return false; }
}
function findCode(db, code) { return db.codes[String(code).toUpperCase()] || null; }
function listReferrals(db, tenantId, referrerId) {
  return db.referrals.filter(r => (!tenantId || r.tenantId === (tenantId || 'default')) && (!referrerId || r.referrerId === referrerId));
}
module.exports = { load, save, findCode, listReferrals, FILE };
