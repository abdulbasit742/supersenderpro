'use strict';

/**
 * lib/channelSharing/bridges.js
 * Pluggable platform adapters for fan-out. Each target platform maps to a
 * sender function injected at mount time, so the engine stays decoupled from
 * the actual WhatsApp/Telegram/Facebook/Instagram SDKs and is fully testable.
 *
 * A sender has the signature:
 *   async (targetId, content, media) => any   (throws on failure)
 */

const SUPPORTED = ['whatsapp', 'telegram', 'facebook', 'instagram'];

function isSupported(platform) { return SUPPORTED.includes(String(platform || '').toLowerCase()); }

/**
 * Send content to a target on a platform using the provided senders map.
 * @param {string} platform
 * @param {string} targetId
 * @param {string} content
 * @param {Array}  media
 * @param {object} senders - { whatsapp:fn, telegram:fn, ... }
 */
async function send(platform, targetId, content, media, senders = {}) {
  const p = String(platform || '').toLowerCase();
  if (!isSupported(p)) throw new Error('unsupported platform: ' + platform);
  const fn = senders[p];
  if (typeof fn !== 'function') throw new Error('no sender wired for platform: ' + p);
  return fn(targetId, content, media || []);
}

module.exports = { SUPPORTED, isSupported, send };
