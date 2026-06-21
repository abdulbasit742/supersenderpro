  'use strict';
  /**
   * _statusPreviewFactory.js — consistent, safe per-area status preview for the
   * vendor portal. Read-only. Returns the required shape with liveAction:false +
   * previewOnly:true and merges any area-specific live-flags (all false).
   */
  const service = require('./supplierPortalService');
  function make(area, opts) {
    const o = opts || {};
       return function forToken(previewToken) {
         const s = service.getByToken(previewToken);
      const base = { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true, area,
  warnings: [], blockers: [] };
         if (!s) return Object.assign(base, { ok: false, blockers: ['supplier_not_found'] });
         const status = (s.statuses && s.statuses[area]) || 'none';
         const detail = Object.assign(typeof o.detail === 'function' ? o.detail(s, status) : {}, o.liveFlags || {});
         const warnings = (o.attention || []).includes(status) ? [area + '_needs_attention'] : [];
         return Object.assign(base, { previewToken: s.previewToken, statusPreview: status, detailPreview: detail, warnings });
       };
  }
  module.exports = { make };
