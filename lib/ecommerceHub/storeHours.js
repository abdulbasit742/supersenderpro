'use strict';

/**
 * Ecommerce Hub — store hours + auto-away message.
 * isOpen(): based on STORE_OPEN_HOUR/STORE_CLOSE_HOUR (24h, server tz) and
 * STORE_OPEN_DAYS (0-6 csv). awayMessage() for off-hours auto-reply.
 */

function openHour() { return Number(process.env.STORE_OPEN_HOUR || 9); }
function closeHour() { return Number(process.env.STORE_CLOSE_HOUR || 22); }
function openDays() { const d = String(process.env.STORE_OPEN_DAYS || '0,1,2,3,4,5,6').split(',').map(function (x) { return Number(x.trim()); }); return d; }

function isOpen(now) {
  const d = now || new Date();
  const day = d.getDay();
  const hr = d.getHours();
  if (openDays().indexOf(day) === -1) return false;
  return hr >= openHour() && hr < closeHour();
}
function awayMessage() {
  return process.env.STORE_AWAY_MESSAGE || ('Shukriya message ke liye! Abhi hum offline hain (hours: ' + openHour() + ':00 - ' + closeHour() + ':00). Aapka message note ho gaya, hum jald jawab denge.');
}

module.exports = { isOpen, awayMessage, openHour, closeHour };
