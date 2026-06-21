// lib/platformControl/templateReadiness.js — read-only WhatsApp/message template readiness. No live sync.
'use strict';
const cfg = require('./config');

function getTemplateReadiness() {
  const templateFilesPreview = cfg.anyExists(['lib/whatsappCloudTemplates', 'routes/templateMarketplaceRoutes.js',
    'public/templates.html', 'public/template-marketplace.html', 'lib/templateMarketplace']);
  const defaultTemplateConfiguredPreview = !!process.env.WHATSAPP_CLOUD_DEFAULT_TEMPLATE;
  return cfg.safetyFlags({
    liveTemplateSyncEnabled: false,
    templateFilesPreview,
    defaultTemplateConfiguredPreview,
    defaultLanguageConfiguredPreview: !!process.env.WHATSAPP_CLOUD_DEFAULT_LANGUAGE,
    warnings: templateFilesPreview ? [] : ['no_template_modules_detected_preview'],
    blockers: [],
  });
}
module.exports = { getTemplateReadiness };
