// src/storage/migrate.js
// SuperSender Pro — one-shot JSON -> Postgres importer.
// Walks data/<tenant>/*.json (and top-level data/*.json as the 'default' tenant)
// and upserts each into ss_store. Idempotent + re-runnable. Supports --dry-run.
//
// Usage:
//   node src/storage/migrate.js                 # import for real
//        node src/storage/migrate.js --dry-run # show what WOULD import, write nothing

'use strict';

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const BASE_DATA_DIR = process.env.TENANT_BASE_DATA_DIR || path.join(process.cwd(), 'data');
const DEFAULT_TENANT = process.env.TENANT_DEFAULT || 'default';

// Files that are NOT per-tenant module stores (skip or handle specially).
const SKIP_FILES = new Set(['_tenants.json']);

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
     return fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !SKIP_FILES.has(f));
}
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (_) { return false; } }

// Build the work list: [{ tenantId, name, fullPath }]
function collect() {
     const jobs = [];
     // 1) top-level data/*.json -> default tenant (legacy single-tenant layout)
     for (const f of listJsonFiles(BASE_DATA_DIR)) {
       jobs.push({ tenantId: DEFAULT_TENANT, name: f, fullPath: path.join(BASE_DATA_DIR, f) });
     }
     // 2) data/<tenant>/*.json -> that tenant
     for (const entry of (fs.existsSync(BASE_DATA_DIR) ? fs.readdirSync(BASE_DATA_DIR) : [])) {
       const sub = path.join(BASE_DATA_DIR, entry);
         if (!isDir(sub)) continue;
         if (entry.startsWith('.')) continue;
         for (const f of listJsonFiles(sub)) {
           jobs.push({ tenantId: entry, name: f, fullPath: path.join(sub, f) });
         }
     }
     return jobs;
}

async function main() {
     const jobs = collect();
     console.log(`[migrate] found ${jobs.length} store file(s)${DRY ? ' (dry-run)' : ''}`);


   if (DRY) {
     for (const j of jobs) {
           let size = 0; try { size = fs.statSync(j.fullPath).size; } catch (_) {}
           console.log(` would import tenant=${j.tenantId} store=${j.name} (${size} bytes)`);
       }
       console.log('[migrate] dry-run complete, nothing written.');
       return;
   }

   const { makeBackend } = require('./postgres');
   const pg = makeBackend();
   let okCount = 0, failCount = 0;

   for (const j of jobs) {
       let doc;
       try { doc = JSON.parse(fs.readFileSync(j.fullPath, 'utf8')); }
       catch (e) { console.error(`      skip ${j.tenantId}/${j.name}: bad JSON (${e.message})`); failCount++; continue; }
       try {
           await pg.write(j.tenantId, j.name, doc);
           okCount++;
         console.log(`     imported   tenant=${j.tenantId}   store=${j.name}`);
       } catch (e) {
           failCount++;
           console.error(`   FAILED   tenant=${j.tenantId}   store=${j.name}: ${e.message}`);
       }
   }

   // Also import the tenant registry into ss_tenant if present.
   const regPath = path.join(BASE_DATA_DIR, '_tenants.json');
   if (fs.existsSync(regPath)) {
       try {
         const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
           for (const t of Object.values(reg.tenants || {})) {
             await pg.pool.query(
               `INSERT INTO ss_tenant (id,name,plan,status,settings,channels)
                VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)
          ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, plan=EXCLUDED.plan, status=EXCLUDED.status,
settings=EXCLUDED.settings, channels=EXCLUDED.channels`,
               [t.id, t.name, t.plan, t.status, JSON.stringify(t.settings || {}), JSON.stringify(t.channels || [])]
             );
           }
           console.log(`   imported tenant registry (${Object.keys(reg.tenants || {}).length} tenants)`);
       } catch (e) { console.error('      tenant registry import failed:', e.message); }
   }

   console.log(`[migrate] done. ok=${okCount} failed=${failCount}`);
   await pg.close();
}

main().catch((e) => { console.error('[migrate] fatal:', e && e.message); process.exit(1); });
