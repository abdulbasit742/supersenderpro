'use strict';
/**
 * scripts/seed-demo.js - seed or clear demo data for a tenant.
 * Usage:
 *   node scripts/seed-demo.js [tenantId]          # seed (default tenant 'demo')
 *   node scripts/seed-demo.js [tenantId] --clear   # remove seeded data
 */
process.env.DB_DRIVER = process.env.DB_DRIVER || 'json';
const { seedTenant, clearTenant } = require('../lib/seed/demoData');

(async () => {
  const tenantId = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'demo';
  const clear = process.argv.includes('--clear');
  try {
    const r = clear ? await clearTenant(tenantId) : await seedTenant(tenantId);
    console.log((clear ? 'Cleared' : 'Seeded') + ' demo data:');
    console.log(JSON.stringify(r, null, 2));
  } catch (e) { console.error('seed failed:', e.message); process.exit(1); }
})();
