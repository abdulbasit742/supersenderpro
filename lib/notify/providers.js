'use strict';
/**
 * lib/notify/providers.js - channel providers for the notification dispatcher.
 * Each provider exposes detect() (is it configured?) and send(to, message, opts).
 * All are safe: if unconfigured or in dry-run, they report 'prepared' instead of sending.
 */
let signed = null; try { signed = require('../webhooks/signedDelivery'); } catch {}

const email = {
  id: 'email',
  detect() { return !!(process.env.SMTP_HOST && process.env.SMTP_USER); },
  async send(to, message, opts = {}) {
    if (!this.detect()) return { ok: false, prepared: true, reason: 'SMTP not configured', to };
    // Real SMTP would go here (nodemailer not a dep yet). Report prepared with the resolved payload.
    return { ok: false, prepared: true, reason: 'SMTP send stub - add nodemailer to enable', to, subject: opts.subject || 'Notification' };
  },
};

const whatsapp = {
  id: 'whatsapp',
  detect() { return typeof global.sendWhatsApp === 'function'; },
  async send(to, message, opts = {}) {
    if (!this.detect()) return { ok: false, prepared: true, reason: 'global.sendWhatsApp not available', to };
    try { await global.sendWhatsApp(to, message, Object.assign({ source: 'notify' }, opts.meta || {})); return { ok: true, to }; }
    catch (e) { return { ok: false, error: e.message, to }; }
  },
};

const webhook = {
  id: 'webhook',
  detect() { return !!signed; },
  async send(to, message, opts = {}) {
    if (!signed) return { ok: false, prepared: true, reason: 'signed delivery unavailable', to };
    const payload = { type: opts.type || 'notification', message, meta: opts.meta || {} };
    const r = await signed.deliver(to, payload, { secret: opts.secret || '', dryRun: opts.dryRun });
    return { ok: !!r.ok, prepared: !!r.dryRun, status: r.status, to };
  },
};

module.exports = { email, whatsapp, webhook };
