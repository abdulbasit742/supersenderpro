  'use strict';

  const fs = require('fs');
  const path = require('path');
  const dup = require('./duplicateDetector');
  const redactor = require('./redactor');

  const ROOT = process.cwd();
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function loadCustomers() {
      const candidates = [
        path.join(ROOT, 'data', 'customers.json'),
          path.join(ROOT, 'data', 'customer360', 'customers.json'),
          path.join(ROOT, 'data', 'crm', 'customers.json'),
      ];
      for (const file of candidates) {
          try {
            if (fs.existsSync(file)) {
               const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
               if (Array.isArray(parsed)) return parsed;
               if (parsed && Array.isArray(parsed.customers)) return parsed.customers;
           }
          } catch (_) { /* try next */ }
      }
      return [];
  }

  function run() {
      const customers = loadCustomers();
      const issues = [];

      customers.forEach((c, idx) => {
          const id = c.id != null ? c.id : `idx_${idx}`;
          const hasPhone = c.phone || c.mobile || c.whatsapp;
          const hasEmail = c.email;
          if (!hasPhone && !hasEmail) {
        issues.push({ ruleId: 'CUST_MISSING_CONTACT', entity: 'customer', severity: 'high', ref: { customerId: id },
  message: 'No phone or email on record' });
          }
          if (hasEmail && !EMAIL_RE.test(String(c.email))) {
        issues.push({ ruleId: 'CUST_BAD_EMAIL', entity: 'customer', severity: 'medium', ref: { customerId: id, email:
  redactor.maskEmail(c.email) }, message: 'Malformed email' });
          }
          if (hasPhone) {
           const digits = String(hasPhone).replace(/\D/g, '');


         if (digits.length < 7 || digits.length > 15) {
       issues.push({ ruleId: 'CUST_BAD_PHONE', entity: 'customer', severity: 'medium', ref: { customerId: id, phone:
redactor.maskPhone(hasPhone) }, message: 'Malformed phone' });
         }
     }
   });


   // Duplicate customers by normalized phone, then email.
   const phoneGroups = dup.findDuplicateGroups(customers, ['phone'], 'id');
   const emailGroups = dup.findDuplicateGroups(customers, ['email'], 'id');
   [...phoneGroups, ...emailGroups].forEach((g) => {
   issues.push({ ruleId: 'CUST_DUP_CONTACT', entity: 'customer', severity: 'critical', ref: { memberIds: g.memberIds,
matchedOn: g.matchedOn }, message: `Duplicate customer across ${g.size} records` });
   });


   return issues;
}

module.exports = { loadCustomers, run };
