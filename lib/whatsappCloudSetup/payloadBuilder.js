 'use strict';

 /**
     * Builds DRY-RUN WhatsApp Cloud API template-send payload previews.
     * - Never sends anything.
     * - Masks the recipient phone in all output.
     * - Returns a payload preview object only.
     */

 const registry = require('./templateRegistry');

 function maskPhone(phone) {
   if (!phone) return null;
      const digits = String(phone).replace(/[^0-9]/g, '');
      if (digits.length < 4) return '****';
      return '****' + digits.slice(-3);
 }

 // Build template components from ordered body params.
 function buildComponents(params) {
   const list = Array.isArray(params) ? params : [];
      if (list.length === 0) return [];
      return [
          {
              type: 'body',
              parameters: list.map(function (p) {
                return { type: 'text', text: String(p) };
              }),
          },
      ];
 }

 /**
     * @param {object} opts
     * @param {string} opts.templateName
     * @param {string} opts.to                raw recipient (will be masked in output)
     * @param {string} [opts.language]        overrides template/default language
     * @param {string[]} [opts.params]        ordered body params; falls back to sampleParams
     */
 function buildTemplatePreview(opts) {
   opts = opts || {};
      const warnings = [];
      const tpl = registry.getTemplate(opts.templateName);

      if (!tpl) {
          return {
            ok: false,

         error: 'unknown_template',
         message: 'Template not found in local registry: ' + (opts.templateName || '(none)'),
         knownTemplates: registry.templateNames(),
       };
   }

   if (!opts.to) warnings.push('No recipient provided; preview uses a placeholder.');
if (tpl.category === 'MARKETING') warnings.push('MARKETING template: requires user opt-in and Meta marketing policy compliance.');
if (tpl.status !== 'approved-placeholder') warnings.push('Template status is "' + tpl.status + '"; confirm real Meta approval before live send.');

   const language = (opts.language || tpl.language || registry.DEFAULT_LANGUAGE);
   const params = (Array.isArray(opts.params) && opts.params.length > 0) ? opts.params : tpl.sampleParams;
   const usingSample = !(Array.isArray(opts.params) && opts.params.length > 0);
   if (usingSample) warnings.push('Using sampleParams from registry (no params supplied).');

   const maskedTo = maskPhone(opts.to) || '****000';


   const payloadPreview = {
     messaging_product: 'whatsapp',
       to: maskedTo,
       type: 'template',
       template: {
         name: tpl.name,
         language: { code: language },
         components: buildComponents(params),
       },
   };


   return {
       ok: true,
       dryRun: true,
       template: {
         name: tpl.name,
         category: tpl.category,
         status: tpl.status,
         placeholders: tpl.placeholders,
       },
       maskedTo: maskedTo,
       payloadPreview: payloadPreview,
       warnings: warnings,
       note: 'Preview only. No message was sent and no Meta API was called.',
   };
}

module.exports = {
   maskPhone,
   buildComponents,
   buildTemplatePreview,
};
