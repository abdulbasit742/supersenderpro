  'use strict';

  const fs = require('fs');
  const path = require('path');
  const dup = require('./duplicateDetector');

  const ROOT = process.cwd();

  function loadSuppliers() {
      const candidates = [
        path.join(ROOT, 'data', 'suppliers.json'),
          path.join(ROOT, 'data', 'supplierPlanner', 'suppliers.json'),
          path.join(ROOT, 'data', 'procurement', 'suppliers.json'),
      ];
      for (const file of candidates) {
          try {
            if (fs.existsSync(file)) {
                const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (Array.isArray(parsed)) return parsed;
                if (parsed && Array.isArray(parsed.suppliers)) return parsed.suppliers;
            }
          } catch (_) { /* try next */ }
      }
      return [];
  }


  function run() {
      const suppliers = loadSuppliers();
      const issues = [];

      suppliers.forEach((s, idx) => {
          const id = s.id != null ? s.id : `idx_${idx}`;
          const hasContact = s.phone || s.email || s.contact;
          if (!hasContact) {
            issues.push({ ruleId: 'SUPP_MISSING_CONTACT', entity: 'supplier', severity: 'medium', ref: { supplierId: id },
  message: 'Supplier has no contact info' });
      }
      });

      const nameGroups = dup.findDuplicateGroups(suppliers, ['name'], 'id');
      const taxGroups = dup.findDuplicateGroups(suppliers, ['taxId'], 'id');
      [...nameGroups, ...taxGroups].forEach((g) => {
        issues.push({ ruleId: 'SUPP_DUP', entity: 'supplier', severity: 'high', ref: { memberIds: g.memberIds, matchedOn:
  g.matchedOn }, message: `Duplicate supplier across ${g.size} records` });
    });

      return issues;


}

module.exports = { loadSuppliers, run };
