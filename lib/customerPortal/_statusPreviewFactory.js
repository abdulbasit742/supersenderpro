 'use strict';
 /**
  * _statusPreviewFactory.js — builds a consistent, safe per-area status preview.
  * Read-only. Returns the required shape with liveAction:false + previewOnly:true.
  */
 const service = require('./customerPortalService');

 function make(area, opts) {
   const o = opts || {};
      return function forToken(previewToken) {
        const c = service.getByToken(previewToken);

       const base = { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true, area,
 warnings: [], blockers: [] };
     if (!c) return Object.assign(base, { ok: false, blockers: ['customer_not_found'] });
       const status = (c.statuses && c.statuses[area]) || 'none';
       const detail = typeof o.detail === 'function' ? o.detail(c, status) : {};
       const warnings = (o.attention || []).includes(status) ? [area + '_needs_attention'] : [];
       return Object.assign(base, { previewToken: c.previewToken, statusPreview: status, detailPreview: detail, warnings });
     };
 }
 module.exports = { make };
