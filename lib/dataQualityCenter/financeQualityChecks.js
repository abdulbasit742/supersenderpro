  'use strict';

  const fs = require('fs');
  const path = require('path');
  const dup = require('./duplicateDetector');
  const redactor = require('./redactor');
  const customerChecks = require('./customerQualityChecks');

  const ROOT = process.cwd();

  function loadInvoices() {
      const candidates = [
        path.join(ROOT, 'data', 'invoices.json'),
          path.join(ROOT, 'data', 'receivables', 'invoices.json'),
          path.join(ROOT, 'data', 'accounting', 'invoices.json'),
      ];
      for (const file of candidates) {
          try {
            if (fs.existsSync(file)) {
                const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (Array.isArray(parsed)) return parsed;
                if (parsed && Array.isArray(parsed.invoices)) return parsed.invoices;
            }
          } catch (_) { /* try next */ }
      }
      return [];
  }

  function run() {
      const invoices = loadInvoices();
      const customers = customerChecks.loadCustomers();
      const customerIds = new Set(customers.map((c) => String(c.id)));
      const issues = [];

      invoices.forEach((inv, idx) => {
          const id = inv.id != null ? inv.id : `idx_${idx}`;
          if (inv.customerId != null && !customerIds.has(String(inv.customerId))) {
        issues.push({ ruleId: 'FIN_ORPHAN_INVOICE', entity: 'finance', severity: 'high', ref: { invoiceId: id }, message:
  'Invoice references unknown customer' });
          }
          const amount = Number(inv.amount != null ? inv.amount : inv.total);
          if (!Number.isFinite(amount) || amount <= 0) {
            issues.push({ ruleId: 'FIN_NEGATIVE_AMOUNT', entity: 'finance', severity: 'high', ref: { invoiceId: id }, message:
  'Negative or zero invoice amount' });
      }
      });


   const numberField = invoices.some((i) => i.invoiceNo != null) ? 'invoiceNo' : 'number';
   const dupGroups = dup.findDuplicateGroups(invoices, [numberField], 'id');
   dupGroups.forEach((g) => {
     issues.push({ ruleId: 'FIN_DUP_INVOICE', entity: 'finance', severity: 'critical', ref: { memberIds: g.memberIds },
message: `Duplicate invoice number across ${g.size} records` });
 });

   return issues.map((i) => redactor.redactObject(i));
}

module.exports = { loadInvoices, run };
