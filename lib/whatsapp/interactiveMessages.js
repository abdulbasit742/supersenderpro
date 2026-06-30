'use strict';
/**
 * interactiveMessages.js — WhatsApp Feature #2: interactive message builder.
 *
 * Plain text menus ("reply 1/2/3") work, but the Cloud API supports proper tappable UI: reply
 * buttons (up to 3) and list menus (sections of rows). This builds the exact payloads, validating
 * WhatsApp's limits so you don't get API errors. Pairs with menu flows (#flows1) to make the bot feel
 * native instead of "type a number".
 *
 * Pure builder (no I/O, no deps). The deploy posts the returned payload to the Cloud API.
 */

function clamp(str, max) { return String(str == null ? '' : str).slice(0, max); }

/**
 * Reply-buttons message (max 3 buttons).
 * @param {Object} opts { to, body, buttons:[{id, title}], header?, footer? }
 */
function buttons(opts = {}) {
  if (!opts.to) throw new Error('to required');
  if (!opts.body) throw new Error('body required');
  const btns = Array.isArray(opts.buttons) ? opts.buttons : [];
  if (btns.length < 1 || btns.length > 3) throw new Error('1-3 buttons required (WhatsApp limit)');

  const action = {
    buttons: btns.map((b, i) => ({
      type: 'reply',
      reply: { id: clamp(b.id || `btn_${i + 1}`, 256), title: clamp(b.title, 20) } // title max 20 chars
    }))
  };
  const interactive = { type: 'button', body: { text: clamp(opts.body, 1024) }, action };
  if (opts.header) interactive.header = { type: 'text', text: clamp(opts.header, 60) };
  if (opts.footer) interactive.footer = { text: clamp(opts.footer, 60) };

  return {
    messaging_product: 'whatsapp',
    to: String(opts.to).replace(/[^\d]/g, ''),
    type: 'interactive',
    interactive
  };
}

/**
 * List menu (sections of rows). Up to 10 rows total across sections; one button label.
 * @param {Object} opts { to, body, buttonText, sections:[{ title, rows:[{id,title,description?}] }], header?, footer? }
 */
function list(opts = {}) {
  if (!opts.to) throw new Error('to required');
  if (!opts.body) throw new Error('body required');
  const sections = Array.isArray(opts.sections) ? opts.sections : [];
  if (!sections.length) throw new Error('at least one section required');
  const totalRows = sections.reduce((n, s) => n + ((s.rows && s.rows.length) || 0), 0);
  if (totalRows < 1 || totalRows > 10) throw new Error('1-10 total rows required (WhatsApp limit)');

  const action = {
    button: clamp(opts.buttonText || 'Menu', 20),
    sections: sections.map(s => ({
      title: clamp(s.title || '', 24),
      rows: (s.rows || []).map((r, i) => ({
        id: clamp(r.id || `row_${i + 1}`, 200),
        title: clamp(r.title, 24),
        description: r.description ? clamp(r.description, 72) : undefined
      }))
    }))
  };
  const interactive = { type: 'list', body: { text: clamp(opts.body, 1024) }, action };
  if (opts.header) interactive.header = { type: 'text', text: clamp(opts.header, 60) };
  if (opts.footer) interactive.footer = { text: clamp(opts.footer, 60) };

  return {
    messaging_product: 'whatsapp',
    to: String(opts.to).replace(/[^\d]/g, ''),
    type: 'interactive',
    interactive
  };
}

/** Parse an interactive reply out of an inbound Cloud API message (button or list selection). */
function parseReply(msg = {}) {
  const i = msg.interactive;
  if (!i) return null;
  if (i.type === 'button_reply') return { id: i.button_reply.id, title: i.button_reply.title };
  if (i.type === 'list_reply') return { id: i.list_reply.id, title: i.list_reply.title };
  return null;
}

module.exports = { buttons, list, parseReply };
