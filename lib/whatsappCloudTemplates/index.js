// lib/whatsappCloudTemplates/index.js — Barrel for the WhatsApp Cloud Template Manager.
'use strict';

const store = require('./templateStore');
const model = require('./templateModel');
const validator = require('./templateValidator');
const catalog = require('./templateCatalog');
const preview = require('./templatePreview');
const quality = require('./templateQuality');
const syncPreview = require('./templateSyncPreview');

function report() {
  const templates = store.all();
  const byStatus = {};
  const byCategory = {};
  templates.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    total: templates.length,
    byStatus,
    byCategory,
    templates: templates.map((t) => ({
      id: t.id, name: t.name, language: t.language, category: t.category,
      status: t.status, qualityRating: t.qualityRating, variables: t.variables,
    })),
    dryRun: true,
  };
}

module.exports = { store, model, validator, catalog, preview, quality, syncPreview, report };
