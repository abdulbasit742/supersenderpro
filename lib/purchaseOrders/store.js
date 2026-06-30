// lib/purchaseOrders/store.js
// Tiny JSON file store helper (no external deps).
// Atomic-ish writes via temp file + rename.

'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config');

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir();
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
  return data;
}

function nextId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = { ensureDir, readJson, writeJson, nextId, DATA_DIR, path };
