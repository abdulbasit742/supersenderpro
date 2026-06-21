'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'personality-disc.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({
      profiles: {},
      messageLogs: [],
      draftLogs: [],
      updatedAt: new Date().toISOString(),
    }, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return {
      profiles: parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {},
      messageLogs: Array.isArray(parsed.messageLogs) ? parsed.messageLogs : [],
      draftLogs: Array.isArray(parsed.draftLogs) ? parsed.draftLogs : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch (error) {
    const backupPath = STORE_PATH + '.broken-' + Date.now();
    try { fs.copyFileSync(STORE_PATH, backupPath); } catch (_) {}
    return { profiles: {}, messageLogs: [], draftLogs: [], updatedAt: new Date().toISOString() };
  }
}

function writeStore(nextStore) {
  ensureStore();
  const payload = Object.assign({}, nextStore, { updatedAt: new Date().toISOString() });
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, STORE_PATH);
  return payload;
}

function safeClientId(clientId) {
  return String(clientId || '').trim().replace(/[^\w@.+-]/g, '_').slice(0, 120);
}

function upsertProfile(clientId, result) {
  const id = safeClientId(clientId);
  if (!id) return null;
  const store = readStore();
  const previous = store.profiles[id] || {};
  store.profiles[id] = Object.assign({}, previous, result, {
    clientId: id,
    createdAt: previous.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  writeStore(store);
  return store.profiles[id];
}

function appendMessageLog(entry) {
  const store = readStore();
  store.messageLogs.unshift(Object.assign({
    id: 'msglog_' + Date.now() + '_' + Math.random().toString(16).slice(2),
    createdAt: new Date().toISOString(),
  }, entry));
  store.messageLogs = store.messageLogs.slice(0, 1000);
  writeStore(store);
}

function appendDraftLog(entry) {
  const store = readStore();
  store.draftLogs.unshift(Object.assign({
    id: 'draft_' + Date.now() + '_' + Math.random().toString(16).slice(2),
    createdAt: new Date().toISOString(),
  }, entry));
  store.draftLogs = store.draftLogs.slice(0, 500);
  writeStore(store);
}

function getProfile(clientId) {
  const id = safeClientId(clientId);
  return readStore().profiles[id] || null;
}

function listProfiles(options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 50), 200));
  const type = String(options.type || '').toUpperCase();
  const rows = Object.values(readStore().profiles)
    .filter((profile) => !type || profile.primaryType === type)
    .sort((a, b) => String(b.updatedAt || b.analyzedAt || '').localeCompare(String(a.updatedAt || a.analyzedAt || '')));
  return rows.slice(0, limit);
}

function getStats() {
  const store = readStore();
  const profiles = Object.values(store.profiles);
  const byType = profiles.reduce((acc, profile) => {
    acc[profile.primaryType] = (acc[profile.primaryType] || 0) + 1;
    return acc;
  }, {});
  return {
    profileCount: profiles.length,
    messageLogCount: store.messageLogs.length,
    draftLogCount: store.draftLogs.length,
    byType,
    updatedAt: store.updatedAt,
  };
}

module.exports = {
  STORE_PATH,
  readStore,
  writeStore,
  upsertProfile,
  appendMessageLog,
  appendDraftLog,
  getProfile,
  listProfiles,
  getStats,
};
