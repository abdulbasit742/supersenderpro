'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ARTIFACTS_DIR = process.env.GROUP_COMMERCE_ARTIFACTS_DIR || path.join(ROOT, 'artifacts');
const STRICT = String(process.env.GROUP_COMMERCE_CHECK_STRICT || 'false') === 'true';

const rel = (p) => path.relative(ROOT, p) || p;
const abs = (p) => path.join(ROOT, p);
const exists = (p) => { try { fs.accessSync(abs(p)); return true; } catch { return false; } };
const readSafe = (p) => { try { return fs.readFileSync(abs(p), 'utf8'); } catch { return null; } };

// ---- expected Group Commerce OS surface ----
const CORE_FILES = [
  { path: 'lib/groupCommerce/store.js', kind: 'lib', critical: true },
  { path: 'lib/groupCommerce/groupRegistry.js', kind: 'lib', critical: true },
  { path: 'lib/groupCommerce/commandRouter.js', kind: 'lib', critical: true },
  { path: 'lib/groupCommerce/moderation.js', kind: 'lib', critical: false },
  { path: 'lib/groupCommerce/messageAnalyzer.js', kind: 'lib', critical: true },
  { path: 'lib/groupCommerce/catalog.js', kind: 'lib', critical: false },
  { path: 'lib/groupCommerce/ecommerceBridge.js', kind: 'lib', critical: false },
  { path: 'lib/groupCommerce/relayPlanner.js', kind: 'lib', critical: false },
  { path: 'lib/groupCommerce/agentRegistry.js', kind: 'lib', critical: false },
  { path: 'lib/groupCommerce/flowNodes.js', kind: 'lib', critical: false },
  { path: 'lib/groupCommerce/pauseManager.js', kind: 'lib', critical: false },
  { path: 'routes/groupCommerceRoutes.js', kind: 'route', critical: true },
  { path: 'public/group-commerce.html', kind: 'page', critical: true },
  { path: 'public/js/group-commerce.js', kind: 'asset', critical: false },
  { path: 'public/css/group-commerce.css', kind: 'asset', critical: false },
  { path: 'docs/GROUP_COMMERCE_OS.md', kind: 'doc', critical: false },
  { path: 'docs/GROUP_COMMERCE_COMMANDS.md', kind: 'doc', critical: false },

    { path: 'docs/GROUP_COMMERCE_SAFETY.md', kind: 'doc', critical: false },
    { path: 'scripts/group-commerce-check.js', kind: 'script', critical: false },
    { path: 'tests/smoke/groupCommerceSmoke.js', kind: 'test', critical: false },
    { path: 'tests/smoke/groupCommerceFixtures.js', kind: 'test', critical: false },
];

// ---- related existing systems (informational, helps duplicate-risk detection) ----
const RELATED_GLOB_HINTS = [
 'lib/groupCommerce', 'src/modules', 'routes', 'public',
];
const RELATED_KEYWORDS = [
    'whatsapp', 'group', 'ecommerce', 'catalog', 'order', 'payment',
    'crm', 'customer', 'dealer', 'seller', 'rate', 'stock', 'agent',
    'flow', 'social', 'channel', 'relay', 'moderation',
];


function walk(dir, acc, depth = 0) {
    if (depth > 4) return acc;
    let entries;
    try { entries = fs.readdirSync(abs(dir), { withFileTypes: true }); } catch { return acc; }
    for (const e of entries) {
        if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
        const child = path.join(dir, e.name);
        if (e.isDirectory()) walk(child, acc, depth + 1);
        else if (e.isFile() && e.name.endsWith('.js')) acc.push(child);
    }
    return acc;
}


// Detect duplicate-risk: same logical filename appearing in multiple roots.
function detectDuplicateRisk() {
    const seen = {};
    for (const hint of RELATED_GLOB_HINTS) {
        if (!exists(hint)) continue;
        const files = walk(hint, []);
        for (const f of files) {
          const base = path.basename(f).toLowerCase();
            if (!base.includes('group') && !base.includes('commerce')) continue;
            (seen[base] = seen[base] || []).push(rel(abs(f)));
        }
    }
    return Object.entries(seen)
      .filter(([, locs]) => locs.length > 1)
        .map(([base, locs]) => ({ file: base, locations: locs }));
}

// Safe require probe. Wrapped so a throwing module does not kill the scan.
function requireProbe(relPath) {
 if (!exists(relPath)) return { ok: false, reason: 'missing' };
    try {
      require(abs(relPath));
      return { ok: true };
    } catch (err) {
        return { ok: false, reason: 'require_failed', error: String(err && err.message || err).slice(0, 300) };
    }
}

// Wiring checks (read-only string scans).
function checkWiring() {
 const server = readSafe('server.js') || '';
   const index = readSafe('public/index.html') || '';
   const env = readSafe('.env.example') || '';
   const pkg = readSafe('package.json') || '';


   const countOccurrences = (hay, needle) =>
     hay.split(needle).length - 1;

   return {
       routeMounted: /app\.use\(\s*['"]\/api\/group-commerce['"]/.test(server),
       routeMountCount: countOccurrences(server, "/api/group-commerce"),
       dashboardLink: index.includes('group-commerce.html'),
       dashboardLinkCount: countOccurrences(index, 'group-commerce.html'),
       envEnabledPresent: /GROUP_COMMERCE_ENABLED/.test(env),
       envDryRunPresent: /GROUP_COMMERCE_DRY_RUN/.test(env),
       pkgCheckScript: /\"group-commerce:check\"/.test(pkg),
       pkgSmokeScript: /\"group-commerce:smoke\"/.test(pkg),
   };
}


function classify(file, wiring) {
   if (!exists(file.path)) return file.critical ? 'missing' : 'missing';
   // exists; refine for libs/routes
   if (file.kind === 'route') {
     if (!wiring.routeMounted) return 'needs_wiring';
       if (wiring.routeMountCount > 1) return 'duplicate_risk';
   }
   if (file.kind === 'page' && wiring.dashboardLinkCount > 1) return 'duplicate_risk';
   return 'exists';
}


function main() {
 const wiring = checkWiring();
   const fileResults = CORE_FILES.map((f) => {
     const status = classify(f, wiring);
       const probe = f.kind === 'lib' || f.kind === 'route' ? requireProbe(f.path) : null;
       return {
         path: f.path,
         kind: f.kind,
         critical: !!f.critical,
         status,
         requireProbe: probe,
       };
   });


   const duplicateRisks = detectDuplicateRisk();


   const summary = {
     exists: fileResults.filter((r) => r.status === 'exists').length,
       missing: fileResults.filter((r) => r.status === 'missing').length,
       needs_wiring: fileResults.filter((r) => r.status === 'needs_wiring').length,
       duplicate_risk: fileResults.filter((r) => r.status === 'duplicate_risk').length,
       duplicate_risk_files: duplicateRisks.length,
   };

   const criticalMissing = fileResults.filter((r) => r.critical && r.status === 'missing');


   const report = {
       generatedAt: new Date().toISOString(),
       root: ROOT,
       groupCommercePresent: fileResults.some((r) => r.status !== 'missing'),
       wiring,
       summary,
       files: fileResults,
       duplicateRisks,
       criticalMissing: criticalMissing.map((r) => r.path),
   };

   // write artifacts (read-only w.r.t. live data; only writes to artifacts dir)
   try { fs.mkdirSync(ARTIFACTS_DIR, { recursive: true }); } catch {}
   fs.writeFileSync(path.join(ARTIFACTS_DIR, 'group_commerce_check.json'), JSON.stringify(report, null, 2));
   fs.writeFileSync(path.join(ARTIFACTS_DIR, 'group_commerce_check.md'), toMarkdown(report));


   // console summary
   console.log('Group Commerce OS check');
   console.log(' present:', report.groupCommercePresent);
   console.log(' exists/missing/needs_wiring/dup:',
     summary.exists, summary.missing, summary.needs_wiring, summary.duplicate_risk_files);
   if (criticalMissing.length) {
     console.log(' critical missing:', criticalMissing.map((r) => r.path).join(', '));
   }
   console.log('    report:', rel(path.join(ARTIFACTS_DIR, 'group_commerce_check.json')));


   if (STRICT && criticalMissing.length) process.exit(1);
   process.exit(0);
}

function toMarkdown(r) {
   const lines = [];
   lines.push('# Group Commerce OS — Check Report');
   lines.push('');
   lines.push(`Generated: ${r.generatedAt}`);
   lines.push(`Present: ${r.groupCommercePresent}`);
   lines.push('');
   lines.push('## Summary');
   lines.push(`- exists: ${r.summary.exists}`);
   lines.push(`- missing: ${r.summary.missing}`);
   lines.push(`- needs_wiring: ${r.summary.needs_wiring}`);
   lines.push(`- duplicate_risk files: ${r.summary.duplicate_risk_files}`);
   lines.push('');
   lines.push('## Wiring');
   for (const [k, v] of Object.entries(r.wiring)) lines.push(`- ${k}: ${v}`);
   lines.push('');
   lines.push('## Files');
   lines.push('| Path | Kind | Status | Require |');
   lines.push('| --- | --- | --- | --- |');
   for (const f of r.files) {
     const probe = f.requireProbe ? (f.requireProbe.ok ? 'ok' : f.requireProbe.reason) : '-';
       lines.push(`| ${f.path} | ${f.kind} | ${f.status} | ${probe} |`);
   }
   if (r.duplicateRisks.length) {
     lines.push('');

        lines.push('## Duplicate risk');
        for (const d of r.duplicateRisks) lines.push(`- ${d.file}: ${d.locations.join(', ')}`);
    }
 return lines.join('') + '';
}


main();
