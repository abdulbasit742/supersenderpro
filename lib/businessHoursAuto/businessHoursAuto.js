'use strict';
/**
 * Business Hours / Away-Message Auto-Responder
 * - Deterministic open/closed decision by weekday + time in a store timezone.
 * - Holiday support (YYYY-MM-DD list).
 * - Per-contact cooldown so the away-message is not spammed.
 * - Optional Ollama phrasing of the away message; template fallback when offline.
 * - Tenant/store-scoped. Missing tenantId throws. ZERO new npm deps.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'businessHoursAuto');

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required');
  }
  return tenantId;
}

function cfgPath(tenantId) {
  return path.join(DATA_DIR, tenantId + '.config.json');
}
function cooldownPath(tenantId) {
  return path.join(DATA_DIR, tenantId + '.cooldown.json');
}

const DEFAULT_CONFIG = {
  timezone: 'Asia/Karachi',
  hours: {
    0: [],
    1: [['09:00', '18:00']],
    2: [['09:00', '18:00']],
    3: [['09:00', '18:00']],
    4: [['09:00', '18:00']],
    5: [['09:00', '18:00']],
    6: [['10:00', '14:00']]
  },
  holidays: [],
  awayMessage: 'Shukriya rabta karne ka! Hum abhi offline hain. Working hours mein aap ko jawab de denge.',
  cooldownMinutes: 120,
  useOllama: true
};

function loadConfig(tenantId) {
  requireTenant(tenantId);
  ensureDir();
  const p = cfgPath(tenantId);
  if (!fs.existsSync(p)) return Object.assign({}, DEFAULT_CONFIG);
  try {
    return Object.assign({}, DEFAULT_CONFIG, JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch (_) {
    return Object.assign({}, DEFAULT_CONFIG);
  }
}

function saveConfig(tenantId, partial) {
  requireTenant(tenantId);
  ensureDir();
  const merged = Object.assign({}, loadConfig(tenantId), partial || {});
  fs.writeFileSync(cfgPath(tenantId), JSON.stringify(merged, null, 2));
  return merged;
}

function loadCooldown(tenantId) {
  ensureDir();
  const p = cooldownPath(tenantId);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return {}; }
}
function saveCooldown(tenantId, map) {
  ensureDir();
  fs.writeFileSync(cooldownPath(tenantId), JSON.stringify(map, null, 2));
}

function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    weekday: wdMap[parts.weekday],
    hhmm: hour + ':' + parts.minute,
    ymd: parts.year + '-' + parts.month + '-' + parts.day
  };
}

function toMin(hhmm) {
  const parts = hhmm.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function isOpen(config, when) {
  const cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
  const now = when ? new Date(when) : new Date();
  const z = zonedParts(now, cfg.timezone);
  if (Array.isArray(cfg.holidays) && cfg.holidays.includes(z.ymd)) {
    return { open: false, reason: 'holiday', ymd: z.ymd, hhmm: z.hhmm };
  }
  const windows = (cfg.hours && cfg.hours[z.weekday]) || [];
  const cur = toMin(z.hhmm);
  for (const w of windows) {
    if (cur >= toMin(w[0]) && cur < toMin(w[1])) {
      return { open: true, reason: 'within-hours', ymd: z.ymd, hhmm: z.hhmm };
    }
  }
  return { open: false, reason: windows.length ? 'after-hours' : 'closed-day', ymd: z.ymd, hhmm: z.hhmm };
}

function inCooldown(tenantId, contact, cooldownMinutes) {
  const map = loadCooldown(tenantId);
  const last = map[contact];
  if (!last) return false;
  const elapsedMin = (Date.now() - last) / 60000;
  return elapsedMin < (cooldownMinutes || DEFAULT_CONFIG.cooldownMinutes);
}

function markSent(tenantId, contact) {
  const map = loadCooldown(tenantId);
  map[contact] = Date.now();
  saveCooldown(tenantId, map);
}

async function phraseAway(baseMessage, cfg) {
  if (!cfg.useOllama) return baseMessage;
  try {
    const aiBrain = require(path.join(process.cwd(), 'ai', 'aiBrain.js'));
    if (aiBrain && typeof aiBrain.processPrompt === 'function') {
      const out = await aiBrain.processPrompt(
        'Rephrase this WhatsApp away-message in warm Roman Urdu, keep it under 30 words: "' + baseMessage + '"',
        { maxTokens: 120 }
      );
      const text = typeof out === 'string' ? out : (out && out.text);
      if (text && text.trim()) return text.trim();
    }
  } catch (_) { /* graceful fallback */ }
  return baseMessage;
}

async function handleIncoming(args) {
  const tenantId = (args || {}).tenantId;
  const contact = (args || {}).contact;
  const when = (args || {}).when;
  requireTenant(tenantId);
  if (!contact) throw new Error('contact is required');
  const cfg = loadConfig(tenantId);
  const state = isOpen(cfg, when);
  if (state.open) {
    return { shouldReply: false, status: 'open', reason: state.reason };
  }
  if (inCooldown(tenantId, contact, cfg.cooldownMinutes)) {
    return { shouldReply: false, status: 'closed', reason: 'cooldown' };
  }
  const message = await phraseAway(cfg.awayMessage, cfg);
  markSent(tenantId, contact);
  return { shouldReply: true, status: 'closed', reason: state.reason, message: message };
}

module.exports = {
  DEFAULT_CONFIG: DEFAULT_CONFIG,
  loadConfig: loadConfig,
  saveConfig: saveConfig,
  isOpen: isOpen,
  inCooldown: inCooldown,
  markSent: markSent,
  handleIncoming: handleIncoming,
  phraseAway: phraseAway,
  _internal: { zonedParts: zonedParts, toMin: toMin }
};
