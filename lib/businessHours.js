// businessHours.js — Office Hours & Away-Message Auto-Responder (Respond.io / Interakt style).
// Lets the store define weekly working hours, holidays, and an away message. Inbound chats that
// arrive outside business hours get a single auto-reply with the expected response time, so
// customers are never left wondering. Prevents reply spam via a per-contact cooldown.

const fs = require('fs');
const path = require('path');

const CRM_DIR = path.join(__dirname, '../data/store_crm');
if (!fs.existsSync(CRM_DIR)) fs.mkdirSync(CRM_DIR, { recursive: true });

const cfgFile = (storeId) => path.join(CRM_DIR, `${storeId}_business_hours.json`);

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

const DEFAULT_CONFIG = {
  enabled: true,
  timezone: 'Asia/Karachi',
  // 0 = Sunday ... 6 = Saturday. open/close in 24h "HH:MM". null = closed all day.
  weekly: {
    0: null,
    1: { open: '09:00', close: '21:00' },
    2: { open: '09:00', close: '21:00' },
    3: { open: '09:00', close: '21:00' },
    4: { open: '09:00', close: '21:00' },
    5: { open: '09:00', close: '21:00' },
    6: { open: '11:00', close: '18:00' }
  },
  holidays: [], // ["2026-08-14"]
  awayMessage: '🌙 Thanks for your message! Our team is currently offline. Our business hours are Mon–Sat, 9:00 AM – 9:00 PM (PKT). We\'ll reply as soon as we\'re back — usually within a few hours. ⏳',
  cooldownHours: 6 // don't re-send away message to same contact within this window
};

class BusinessHours {
  constructor(sendDirect) {
    this.sendDirect = sendDirect;
    this._awaySent = {}; // { storeId: { phone: timestamp } }
  }

  getConfig(storeId) {
    return readJSON(cfgFile(storeId), { ...DEFAULT_CONFIG });
  }

  setConfig(storeId, updates = {}) {
    const cfg = this.getConfig(storeId);
    const merged = { ...cfg, ...updates };
    if (updates.weekly) merged.weekly = { ...cfg.weekly, ...updates.weekly };
    writeJSON(cfgFile(storeId), merged);
    return merged;
  }

  /**
   * Returns the local Date parts for a given timezone.
   */
  _localParts(timezone, date = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Asia/Karachi',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = fmt.formatToParts(date).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: weekdayMap[parts.weekday],
      hhmm: `${parts.hour}:${parts.minute}`,
      isoDate: `${parts.year}-${parts.month}-${parts.day}`
    };
  }

  isWithinBusinessHours(storeId, date = new Date()) {
    const cfg = this.getConfig(storeId);
    if (!cfg.enabled) return true;

    const { day, hhmm, isoDate } = this._localParts(cfg.timezone, date);

    if (Array.isArray(cfg.holidays) && cfg.holidays.includes(isoDate)) return false;

    const today = cfg.weekly[day];
    if (!today || !today.open || !today.close) return false;

    return hhmm >= today.open && hhmm <= today.close;
  }

  /**
   * Called on inbound messages. If outside business hours and not in cooldown,
   * sends the away message once and returns true.
   */
  async handleInbound(storeId, phone) {
    if (this.isWithinBusinessHours(storeId)) return { sent: false, reason: 'within_hours' };

    const cfg = this.getConfig(storeId);
    const now = Date.now();
    this._awaySent[storeId] = this._awaySent[storeId] || {};
    const lastSent = this._awaySent[storeId][phone] || 0;
    const cooldownMs = (cfg.cooldownHours || 6) * 3600 * 1000;

    if (now - lastSent < cooldownMs) return { sent: false, reason: 'cooldown' };

    if (this.sendDirect) {
      try {
        await this.sendDirect(phone, cfg.awayMessage, { source: 'BusinessHours' });
        this._awaySent[storeId][phone] = now;
        return { sent: true };
      } catch (err) {
        return { sent: false, reason: 'send_failed', error: err.message };
      }
    }
    return { sent: false, reason: 'no_sender' };
  }

  /**
   * Human-readable status (for dashboards / health checks).
   */
  getStatus(storeId) {
    const cfg = this.getConfig(storeId);
    const open = this.isWithinBusinessHours(storeId);
    const { day, hhmm } = this._localParts(cfg.timezone);
    return { enabled: cfg.enabled, timezone: cfg.timezone, currentlyOpen: open, localDay: day, localTime: hhmm };
  }
}

module.exports = BusinessHours;
