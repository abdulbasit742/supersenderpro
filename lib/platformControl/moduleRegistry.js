// lib/platformControl/moduleRegistry.js — read-only module discovery (existence only).
'use strict';
const cfg = require('./config');
const { redactModule } = require('./redactor');

function getModuleRegistry() {
  const modulesPreview = cfg.MODULE_CATALOG.map((m) => {
    const exists = cfg.exists(m.path);
    return redactModule({ name: m.name, path: m.path, category: m.category, exists,
      status: exists ? 'available_preview' : 'missing_preview', warnings: exists ? [] : ['module_not_found_preview'] });
  });
  const warnings = modulesPreview.filter((m) => !m.exists).map((m) => 'missing:' + m.name);
  return cfg.safetyFlags({ modulesPreview, totalPreview: modulesPreview.length, warnings, blockers: [] });
}
module.exports = { getModuleRegistry };
