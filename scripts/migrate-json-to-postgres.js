'use strict';
/**
 * scripts/migrate-json-to-postgres.js - idempotent importer from legacy data/*.json into Postgres.
 * Reads the existing store-CRM / orders / quotes JSON files, assigns/normalizes tenantId,
 * and upserts into Postgres via the repository (DB_DRIVER=postgres).
 *
 * Usage:
 *   DB_DRIVER=postgres DATABASE_URL=... node scripts/migrate-json-to-postgres.js [--tenant=default] [--dry]
 *
 * Safe: --dry prints what would be imported without writing. Re-running is idempotent
 * (matches on natural keys like tenantId+phone / tenantId+number).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const tenantArg = (args.find((a) => a.startsWith('--tenant=')) || '--tenant=default').split('=')[1];

function readJSON(rel, fallback) {
  try { const f = path.join(ROOT, rel); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback; } catch { return fallback; }
}

async function main() {
  process.env.DB_DRIVER = process.env.DB_DRIVER || 'postgres';
  if (process.env.DB_DRIVER !== 'postgres') { console.error('Set DB_DRIVER=postgres to migrate.'); process.exit(1); }
  const repo = require('../lib/db');

  // Discover legacy store-CRM customer files: data/store_crm/<storeId>_customers.json
  const crmDir = path.join(ROOT, 'data', 'store_crm');
  const customerFiles = fs.existsSync(crmDir) ? fs.readdirSync(crmDir).filter((f) => f.endsWith('_customers.json')) : [];

  let imported = { customers: 0, orders: 0, quotes: 0 };

  for (const file of customerFiles) {
    const storeId = file.replace('_customers.json', '');
    const tenantId = storeId || tenantArg;
    const data = readJSON(path.join('data', 'store_crm', file), { customers: [] });
    for (const c of (data.customers || [])) {
      const payload = { phone: c.phone, name: c.name || '', city: c.city || '', tier: c.tier || 'Bronze', totalOrders: c.totalOrders || 0, totalSpent: c.totalSpent || 0, tags: c.tags || [], status: c.status || 'active', promoOptIn: c.promoOptIn !== false, source: c.source || 'whatsapp' };
      console.log((DRY ? '[dry] ' : '') + 'customer ' + tenantId + '/' + payload.phone);
      if (!DRY) {
        const existing = (await repo.list(tenantId, 'customers', { phone: payload.phone }))[0];
        if (existing) await repo.update(tenantId, 'customers', existing.id, payload);
        else await repo.create(tenantId, 'customers', payload);
      }
      imported.customers++;
    }
  }

  // Legacy flat files (best-effort): data/orders.json, data/quotes.json
  const orders = readJSON(path.join('data', 'orders.json'), []);
  for (const o of (Array.isArray(orders) ? orders : orders.orders || [])) {
    const tenantId = o.tenantId || o.storeId || tenantArg;
    const payload = { phone: o.phone || '', amount: o.amount || 0, status: o.status || 'pending', productName: o.productName || '', paymentRef: o.paymentRef || '' };
    console.log((DRY ? '[dry] ' : '') + 'order ' + tenantId + '/' + (o.id || payload.phone));
    if (!DRY) await repo.create(tenantId, 'orders', payload);
    imported.orders++;
  }

  console.log('\nDone' + (DRY ? ' (dry-run)' : '') + ':', JSON.stringify(imported));
}

main().catch((e) => { console.error('migration failed:', e.message); process.exit(1); });
