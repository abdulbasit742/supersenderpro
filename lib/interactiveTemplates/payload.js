'use strict';
/**
 * lib/interactiveTemplates/payload.js - validate templates + build WhatsApp Cloud API
 * interactive message payloads. Three kinds: reply buttons, list menus, and CTA-URL.
 * All fields are clipped to spec limits so Meta never rejects on length.
 */
const { limits, types } = require('./config');
const { clip, interpolate } = require('./util');

/** Validate a template definition against WhatsApp interactive spec limits. */
function validate(tpl) {
  const errors = [];
  if (!tpl || typeof tpl !== 'object') return { ok: false, errors: ['template must be an object'] };
  if (!tpl.name) errors.push('name is required');
  if (!types.includes(tpl.type)) errors.push('type must be one of: ' + types.join(', '));
  if (!tpl.bodyText) errors.push('bodyText is required');
  if (tpl.bodyText && tpl.bodyText.length > limits.bodyText) errors.push('bodyText exceeds ' + limits.bodyText + ' chars');
  if (tpl.footerText && tpl.footerText.length > limits.footerText) errors.push('footerText exceeds ' + limits.footerText + ' chars');
  if (tpl.headerText && tpl.headerText.length > limits.headerText) errors.push('headerText exceeds ' + limits.headerText + ' chars');

  if (tpl.type === 'buttons') {
    const btns = tpl.buttons || tpl.options || [];
    if (!btns.length) errors.push('buttons template needs at least 1 button');
    if (btns.length > limits.buttons) errors.push('max ' + limits.buttons + ' reply buttons');
    btns.forEach((b, i) => { if (!(b.title || b.label)) errors.push('button[' + i + '] missing title'); });
  } else if (tpl.type === 'list') {
    const sections = tpl.sections || [];
    if (!sections.length) errors.push('list template needs at least 1 section');
    if (sections.length > limits.listSections) errors.push('max ' + limits.listSections + ' list sections');
    let totalRows = 0;
    sections.forEach((s, i) => {
      const rows = s.rows || [];
      if (!rows.length) errors.push('section[' + i + '] has no rows');
      totalRows += rows.length;
      rows.forEach((r, ri) => { if (!(r.title)) errors.push('section[' + i + '].rows[' + ri + '] missing title'); });
    });
    if (totalRows > limits.listRowsTotal) errors.push('max ' + limits.listRowsTotal + ' total list rows');
  } else if (tpl.type === 'cta_url') {
    if (!tpl.cta || !tpl.cta.url) errors.push('cta_url template needs cta.url');
    if (!tpl.cta || !tpl.cta.displayText) errors.push('cta_url template needs cta.displayText');
  }
  return { ok: errors.length === 0, errors };
}

function header(tpl, ctx) {
  if (!tpl.headerText) return undefined;
  return { type: 'text', text: clip(interpolate(tpl.headerText, ctx), limits.headerText) };
}
function footer(tpl, ctx) {
  if (!tpl.footerText) return undefined;
  return { text: clip(interpolate(tpl.footerText, ctx), limits.footerText) };
}

/** Build the WhatsApp Cloud API message payload for a template + recipient (with {{var}} ctx). */
function build(tpl, toPhone, ctx = {}) {
  const v = validate(tpl);
  if (!v.ok) throw new Error('invalid template: ' + v.errors.join('; '));
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone, type: 'interactive' };
  const body = { text: clip(interpolate(tpl.bodyText, ctx), limits.bodyText) };
  const h = header(tpl, ctx); const f = footer(tpl, ctx);

  if (tpl.type === 'buttons') {
    const btns = (tpl.buttons || tpl.options || []).slice(0, limits.buttons);
    return Object.assign({}, base, { interactive: Object.assign({
      type: 'button',
      body,
    }, h ? { header: h } : {}, f ? { footer: f } : {}, {
      action: { buttons: btns.map((b, i) => ({ type: 'reply', reply: { id: String(b.id || ('btn_' + (i + 1))), title: clip(interpolate(b.title || b.label, ctx), limits.buttonTitle) } })) },
    }) });
  }

  if (tpl.type === 'list') {
    const sections = (tpl.sections || []).slice(0, limits.listSections).map((s) => ({
      title: clip(interpolate(s.title || '', ctx), limits.sectionTitle),
      rows: (s.rows || []).slice(0, limits.listRowsTotal).map((r, ri) => Object.assign(
        { id: String(r.id || ('row_' + (ri + 1))), title: clip(interpolate(r.title, ctx), limits.rowTitle) },
        r.description ? { description: clip(interpolate(r.description, ctx), limits.rowDescription) } : {},
      )),
    }));
    return Object.assign({}, base, { interactive: Object.assign({
      type: 'list',
      body,
    }, h ? { header: h } : {}, f ? { footer: f } : {}, {
      action: { button: clip(interpolate(tpl.listButtonText || 'Menu', ctx), limits.listButton), sections },
    }) });
  }

  if (tpl.type === 'cta_url') {
    return Object.assign({}, base, { interactive: Object.assign({
      type: 'cta_url',
      body,
    }, h ? { header: h } : {}, f ? { footer: f } : {}, {
      action: { name: 'cta_url', parameters: { display_text: clip(interpolate(tpl.cta.displayText, ctx), limits.ctaButtonText), url: tpl.cta.url } },
    }) });
  }

  throw new Error('unsupported type: ' + tpl.type);
}

module.exports = { validate, build };
