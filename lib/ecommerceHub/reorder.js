'use strict';

/**
 * Ecommerce Hub — reorder reminders.
 * remind(): for contacts whose lastOrderAt is older than REORDER_DAYS, send a
 * gentle "time to restock?" nudge with the shop link. Opt-out honored, dedupe
 * via a lastRemindedAt stamp on the contact. Dry-run safe.
 */

const notify = require('./orderNotify');
const contacts = require('./optOutStore');

function msg(name) {
  return [
    'Assalam o Alaikum' + (name ? ' ' + name : '') + '!',
    'Kaafi waqt ho gaya \ud83d\ude0a Shayad ab restock ka time ho?',
    'Naye products dekhne ke liye *!shop* likhein.',
    '', 'Marketing band karne ke liye STOP likhein.'
  ].join('\n');
}

async function remind() {
  const days = Number(process.env.REORDER_DAYS || 30);
  const cutoff = Date.now() - days * 864e5;
  const list = contacts.listContacts(null);
  const out = { ok: true, reminded: 0, details: [] };
  for (const c of list) {
    if (contacts.isOptedOut(c.phone)) continue;
    const last = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : (c.at || 0);
    if (last && last > cutoff) continue;
    if (c.lastRemindedAt && c.lastRemindedAt > cutoff) continue;
    const sent = await notify.send(c.phone, msg(c.name));
    contacts.upsertContact(c.phone, { lastRemindedAt: Date.now() });
    out.reminded++; out.details.push({ phone: c.phone, notified: sent });
  }
  return out;
}

module.exports = { remind, msg };
