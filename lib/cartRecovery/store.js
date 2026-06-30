'use strict';
// JSON-backed atomic store for carts + drafted nudges. No external deps.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'cartRecovery.json');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {} }

function load() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') throw new Error('bad');
    j.carts = j.carts || {};
    j.nudges = j.nudges || [];
    return j;
  } catch (_) {
    return { carts: {}, nudges: [] };
  }
}

function save(db) {
  ensureDir();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE); // atomic-ish swap
}

function withDb(fn) {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}

module.exports = { load, save, withDb, FILE };
