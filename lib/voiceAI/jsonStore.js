// lib/voiceAI/jsonStore.js — Tiny, safe JSON file store shared by all Voice AI modules.
// Never throws on read; creates parent dirs on write; atomic-ish write via temp file.

const fs = require('fs');
const path = require('path');

function ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    ensureDir(file);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch (_e) {
    return false;
  }
}

module.exports = { readJSON, writeJSON, ensureDir };
