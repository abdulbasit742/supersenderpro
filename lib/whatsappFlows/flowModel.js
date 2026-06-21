'use strict';
/**
* flowModel.js — WhatsApp Flow + screen + component shapes, enums, factory.
   * Mirrors Meta WhatsApp Flows JSON (screens with a layout of components, routing
   * via actions). Pure data; no I/O.
*/
const crypto = require('crypto');
const componentTypes = require('./componentTypes');

const FLOW_STATUSES = ['draft', 'preview_ready', 'published_preview', 'paused', 'archived'];
const CATEGORIES = ['lead_capture', 'order', 'booking', 'survey', 'support', 'custom'];


function component(input) {
    const i = input || {};
    return {
      name: i.name || ('field_' + crypto.randomBytes(2).toString('hex')),
      type: componentTypes.isValid(i.type) ? i.type : 'TextBody',
      label: i.label || '',
      text: i.text || '',
      inputType: i.inputType || undefined,
      required: !!i.required,
      options: i.options || undefined,
      captures: componentTypes.isInput(i.type),
    };
}


function screen(input) {
    const i = input || {};
    return {
      id: i.id || ('SCREEN_' + crypto.randomBytes(2).toString('hex').toUpperCase()),
      title: i.title || 'Screen',
      terminal: !!i.terminal,
      layout: (i.layout || i.components || []).map(component),
      nextScreenId: i.nextScreenId || null,
    };
}


function newFlow(input) {
 const now = new Date().toISOString();
    const i = input || {};
    const screens = (i.screens || []).map(screen);
    return {
      id: i.id || 'flow_' + crypto.randomBytes(5).toString('hex'),
      name: i.name || 'Untitled flow',
      category: CATEGORIES.includes(i.category) ? i.category : 'custom',
      status: FLOW_STATUSES.includes(i.status) ? i.status : 'draft',
      screens,
      firstScreenId: i.firstScreenId || (screens[0] && screens[0].id) || null,
      consentRequired: i.consentRequired !== false,
      dryRun: true,
      createdAt: i.createdAt || now,
      updatedAt: now,
    };
}


module.exports = { FLOW_STATUSES, CATEGORIES, component, screen, newFlow };
