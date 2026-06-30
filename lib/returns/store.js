// lib/returns/store.js
// Tiny JSON-backed persistence layer. No external deps; atomic-ish writes.
// Mirrors the convention used by sibling departments.

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

const FILE = path.resolve(process.cwd(), config.dataFile);

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ returns: [] }, null, 2));
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (!Array.isArray(parsed.returns)) parsed.returns = [];
    return parsed;
  } catch (e) {
    return { returns: [] };
  }
}

function writeAll(data) {
  ensureFile();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
  return data;
}

module.exports = { readAll, writeAll, FILE };
