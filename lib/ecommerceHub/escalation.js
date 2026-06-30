'use strict';

/**
 * Ecommerce Hub — complaint escalation.
 * Detects angry/complaint keywords in a buyer message and pings admin with HIGH
 * priority so it never gets lost. Returns a calming buyer ack. Dry-run safe.
 */

const notify = require('./orderNotify');
const cod = require('./codStore');
function adminNumbers() { return String(process.env.ESCALATION_NUMBERS || process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(cod.normNum).filter(Boolean); }
function isComplaint(text) { return /(complaint|shikayat|bakwas|fraud|cheat|ghatiya|worst|refund nahi|paise wapas|scam|bekar|kharab nikla|police|consumer court)/i.test(String(text || '')); }
async function handle(text, fromPhone) {
  if (!isComplaint(text)) return null;
  for (const a of adminNumbers()) await notify.send(a, '\ud83d\udea8 *Complaint / escalation*\nFrom: ' + cod.normNum(fromPhone) + '\nMsg: ' + String(text || '').slice(0, 300));
  return 'Maazrat ke saath, aapki shikayat hamari team tak pohanch gayi hai. Hum foran dekh rahe hain aur jald rabta karenge \ud83d\ude4f';
}
module.exports = { handle, isComplaint };
