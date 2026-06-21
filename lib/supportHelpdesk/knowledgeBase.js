'use strict';
/** KB facade: seed defaults, list, get, search, faq. */
const articleStore = require('./articleStore');
const articleSearch = require('./articleSearch');
const defaults = require('./defaultArticles');
const faqBuilder = require('./faqBuilder');
function seedDefaults() { const existing = articleStore.list(); if (existing.length) return { ok: true, seeded: 0 }; let
n = 0; defaults.forEach((a) => { articleStore.upsert(Object.assign({ status: 'published', lastReviewedAt: new

Date().toISOString() }, a)); n++; }); return { ok: true, seeded: n }; }
function list(filter) { return articleStore.list(filter); }
function get(id) { return articleStore.get(id); }
function search(q, opts) { return articleSearch.search(q, opts); }
function faq(opts) { return faqBuilder.build(opts); }
module.exports = { seedDefaults, list, get, search, faq, upsert: articleStore.upsert, review: articleStore.review };
