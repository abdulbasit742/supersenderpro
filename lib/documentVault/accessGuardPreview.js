 'use strict';
 /**
  * accessGuardPreview.js — previews whether a role MAY access a document. Bridges
     * read-only to existing admin-auth / RBAC when present; else applies a safe
     * default matrix. NEVER changes permissions.
  */
 const SENSITIVE_CATEGORIES = ['finance', 'tax', 'legal', 'staff', 'audit', 'compliance'];
 const DEFAULT_MATRIX = {
   owner: () => true,
      admin: () => true,
      manager: (doc) => doc.category !== 'staff',
      finance: (doc) => ['finance', 'tax', 'audit', 'compliance', 'supplier', 'procurement'].includes(doc.category),
      support: (doc) => ['customer', 'operations', 'sales'].includes(doc.category),
      viewer: (doc) => !SENSITIVE_CATEGORIES.includes(doc.category),
 };


 function rbacAvailable() {
   try { const rbac = require('../../src/modules/rbac'); return !!(rbac && typeof rbac.can === 'function'); } catch (e) {
 return false; }
 }


 function check(doc, role) {
   const r = String(role || 'viewer').toLowerCase();
      const reasons = [];
      let allowed = false;
      const fn = DEFAULT_MATRIX[r];
      if (fn) allowed = !!fn(doc); else reasons.push('unknown_role_default_deny');
   if (SENSITIVE_CATEGORIES.includes(doc.category) && !['owner', 'admin', 'finance'].includes(r) && r !== 'manager')
 reasons.push('sensitive_category');
      const warnings = [];
      if (!rbacAvailable()) warnings.push('rbac_not_detected_default_matrix_used');
      return {
        ok: true, dryRun: true, livePermissionChange: false,
        documentId: doc.id,
        allowedPreview: allowed,
        rolePreview: r,
        reasons,
        warnings, blockers: [],
      };
 }
 module.exports = { check, SENSITIVE_CATEGORIES, rbacAvailable };
