// lib/whatsappCloudSetup/store.js — Persistence for the WhatsApp Cloud setup config (single tenant config + checklist state).
// File is gitignored. Never persists raw tokens (model already masks ids and only stores *Configured booleans).
'use strict';

const fs = require('fs');
const path = require('path');
const { buildConfig, defaultConfig } = require('./configModel');

const FILE = process.env.WHATSAPP_CLOUD_SETUP_STORE_PATH
  || path.join(__dirname, '..', '..', 'data', 'whatsapp-cloud-setup.json');

function ensureDir() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRaw() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (_) {
    return null;
  }
}

function getConfig() {
  const raw = readRaw();
  if (raw && raw.config) return raw.config;
  return defaultConfig();
}

function getChecklistState() {
  const raw = readRaw();
  return (raw && raw.checklistState) || {};
}

function save({ config, checklistState } = {}) {
  ensureDir();
  const current = readRaw() || {};
  const next = {
    config: config ? buildConfig(config) : (current.config || defaultConfig()),
    checklistState: checklistState || current.checklistState || {},
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}

function saveConfig(config) {
  return save({ config }).config;
}

function setChecklistItem(key, done) {
  const state = getChecklistState();
  state[key] = !!done;
  return save({ checklistState: state }).checklistState;
}

module.exports = { FILE, getConfig, getChecklistState, save, saveConfig, setChecklistItem };
