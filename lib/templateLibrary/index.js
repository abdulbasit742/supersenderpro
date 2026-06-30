// lib/templateLibrary/index.js — Message Templates Library (barrel export).
//
// Store reusable message templates with typed variables ({{name}}, {{order|fallback}}),
// categories + tags, version history on edit, a validator that flags missing/undeclared
// variables, and a renderer that fills a template from a context (with per-variable fallbacks).
// Pairs with drip #6 / scheduler #17 / broadcast: pick a template, render with the contact's
// context, send.
//
// SAFETY: JSON-backed pure content store + renderer; sends nothing. Templates are archived, never
// hard-deleted; edits keep a capped version history.

const { config, CATEGORIES } = require('./config');
const variables = require('./variables');
const templateStore = require('./templateStore');

module.exports = {
 config, CATEGORIES,
 store: require('./store'),
 variables,
 templateStore,
 doctor: require('./doctor'),
 // convenience helpers
 render: variables.render,
 validate: variables.validate,
 // render a stored template by id against a context (validates first)
 renderTemplate(id, ctx = {}) {
 const t = templateStore.get(id);
 if (!t) throw new Error('template not found');
 const v = variables.validate(t.body, { context: ctx });
 return { id: t.id, text: variables.render(t.body, ctx), missing: v.missingInContext, ok: v.ok };
 },
};
