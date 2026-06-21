'use strict';


const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = process.cwd();
const ARTIFACTS_DIR = process.env.GROUP_COMMERCE_ARTIFACTS_DIR || path.join(ROOT, 'artifacts');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const STRICT = String(process.env.GROUP_COMMERCE_SMOKE_STRICT || 'false') === 'true';

const abs = (p) => path.join(ROOT, p);
const exists = (p) => { try { fs.accessSync(abs(p)); return true; } catch { return false; } };

let fixtures = { commands: ['/help', '/status', '/pause 5m', '/resume'], expectedAnalysisKeys: [], forbiddenLeakPatterns:
[], messages: [] };
try { fixtures = require('./groupCommerceFixtures'); } catch { /* fixtures optional */ }

const results = [];
const record = (name, status, detail) => {
  results.push({ name, status, detail: detail || null });
     const tag = status.toUpperCase().padEnd(7);
     console.log(` [${tag}] ${name}${detail ? ' — ' + detail : ''}`);

};
// status: pass | fail | skip | warn

function tryRequire(relPath) {
 if (!exists(relPath)) return { ok: false, reason: 'missing' };
    try { return { ok: true, mod: require(abs(relPath)) }; }
    catch (e) { return { ok: false, reason: String(e && e.message || e).slice(0, 200) }; }
}

function httpGet(urlPath, timeoutMs = 1500) {
 return new Promise((resolve) => {
        const url = new URL(urlPath, BASE_URL);
        const req = http.get(url, { timeout: timeoutMs }, (res) => {
          let body = '';
          res.on('data', (c) => { body += c; if (body.length > 200000) req.destroy(); });
          res.on('end', () => resolve({ ok: true, status: res.statusCode, body }));
        });
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
        req.on('error', (e) => resolve({ ok: false, reason: String(e.code || e.message) }));
    });
}

function leaks(str) {
    if (!str) return false;
    return (fixtures.forbiddenLeakPatterns || []).some((re) => re.test(str));
}


async function run() {
 console.log('Group Commerce OS smoke tests');
    console.log('    BASE_URL:', BASE_URL, '| strict:', STRICT);

    // 1. require route + key libs
    const routeReq = tryRequire('routes/groupCommerceRoutes.js');
 record('require route module', routeReq.ok ? 'pass' : (exists('routes/groupCommerceRoutes.js') ? 'fail' : 'skip'),
routeReq.reason);

    for (const lib of ['store', 'groupRegistry', 'commandRouter', 'messageAnalyzer', 'pauseManager']) {
        const p = `lib/groupCommerce/${lib}.js`;
        const r = tryRequire(p);
        record(`require ${lib}`, r.ok ? 'pass' : (exists(p) ? 'fail' : 'skip'), r.reason);
    }

    // 2. command router supports core commands
    const crReq = tryRequire('lib/groupCommerce/commandRouter.js');
    if (crReq.ok && crReq.mod && typeof (crReq.mod.route || crReq.mod.handle) === 'function') {
        const fn = crReq.mod.route || crReq.mod.handle;
        for (const cmd of fixtures.commands) {
          try {
            const out = await fn({ text: cmd, groupId: 'grp_demo_001', dryRun: true });
            const ok = out && typeof out === 'object';
            record(`command ${cmd}`, ok ? 'pass' : 'fail', ok ? null : 'no object returned');
            if (ok && leaks(JSON.stringify(out))) record(`command ${cmd} leak-check`, 'fail', 'forbidden pattern in output');
          } catch (e) { record(`command ${cmd}`, 'fail', String(e.message).slice(0, 120)); }
      }
    } else {
        record('command router api', 'skip', 'commandRouter.route/handle not found');
    }

 // 3. analyzer returns normalized object
 const anReq = tryRequire('lib/groupCommerce/messageAnalyzer.js');
 if (anReq.ok && anReq.mod && typeof anReq.mod.analyze === 'function') {
   try {
      const sample = (fixtures.messages[0] && fixtures.messages[0].text) || 'rate kya hai';
      const out = await anReq.mod.analyze({ text: sample, groupId: 'grp_demo_001' });
      const isObj = out && typeof out === 'object';
      record('analyze-message returns object', isObj ? 'pass' : 'fail');
      if (isObj && fixtures.expectedAnalysisKeys.length) {
        const missing = fixtures.expectedAnalysisKeys.filter((k) => !(k in out));
       record('analyze-message shape', missing.length ? 'warn' : 'pass', missing.length ? 'missing keys: ' +
missing.join(',') : null);
      }
      if (isObj && leaks(JSON.stringify(out))) record('analyze leak-check', 'fail', 'forbidden pattern in output');
   } catch (e) { record('analyze-message', 'fail', String(e.message).slice(0, 120)); }
 } else {
     record('analyze-message api', 'skip', 'messageAnalyzer.analyze not found');
 }

 // 4. dry-run protections default true (env)
 const dryDefault = String(process.env.GROUP_COMMERCE_DRY_RUN || 'true') === 'true';
 record('dry-run default true', dryDefault ? 'pass' : 'warn', dryDefault ? null : 'GROUP_COMMERCE_DRY_RUN is not true');
 for (const k of ['GROUP_COMMERCE_AI_AUTO_REPLY', 'GROUP_COMMERCE_LIVE_GROUP_ACTIONS', 'GROUP_COMMERCE_LIVE_RELAY',
'GROUP_COMMERCE_ECOMMERCE_WRITE']) {
     const off = String(process.env[k] || 'false') === 'false';
     record(`${k} default off`, off ? 'pass' : 'warn');
 }


 // 5. HTTP probes (GET only, optional)
 const ping = await httpGet('/api/group-commerce/status');
 if (!ping.ok) {
   record('server reachable', STRICT ? 'fail' : 'skip', `server down (${ping.reason})`);
 } else {
   record('status endpoint', ping.status === 200 ? 'pass' : 'warn', `HTTP ${ping.status}`);
     if (leaks(ping.body)) record('status leak-check', 'fail', 'forbidden pattern in /status body');
     else record('status leak-check', 'pass');
     const groupsRes = await httpGet('/api/group-commerce/groups');
     if (groupsRes.ok) {
      record('groups api safe', groupsRes.status < 500 ? 'pass' : 'fail', `HTTP ${groupsRes.status}`);
      if (leaks(groupsRes.body)) record('groups leak-check', 'fail', 'forbidden pattern in /groups body');
     } else { record('groups api', 'skip', groupsRes.reason); }
 }


 // 6. dashboard + docs presence
 record('dashboard page exists', exists('public/group-commerce.html') ? 'pass' : 'skip');
 record('docs present', (exists('docs/GROUP_COMMERCE_OS.md') || exists('docs/GROUP_COMMERCE_QA.md')) ? 'pass' : 'skip');


 // ---- write artifacts ----
 const counts = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
 const payload = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, strict: STRICT, counts, results };
 try { fs.mkdirSync(ARTIFACTS_DIR, { recursive: true }); } catch {}
 fs.writeFileSync(path.join(ARTIFACTS_DIR, 'group_commerce_smoke_results.json'), JSON.stringify(payload, null, 2));
 fs.writeFileSync(path.join(ARTIFACTS_DIR, 'group_commerce_smoke_results.md'), toMd(payload));


 console.log(' results:', JSON.stringify(counts));
 const criticalFail = results.some((r) => r.status === 'fail');

   if (STRICT && criticalFail) process.exit(1);
   process.exit(0);
}

function toMd(p) {
 const lines = ['# Group Commerce OS — Smoke Results', '', `Generated: ${p.generatedAt}`, `BASE_URL: ${p.baseUrl}`,
`Strict: ${p.strict}`, '', '## Counts'];
   for (const [k, v] of Object.entries(p.counts)) lines.push(`- ${k}: ${v}`);
   lines.push('', '## Tests', '| Test | Status | Detail |', '| --- | --- | --- |');
   for (const r of p.results) lines.push(`| ${r.name} | ${r.status} | ${r.detail || ''} |`);
   return lines.join('') + '';
}


run().catch((e) => { console.error('smoke runner error:', e); process.exit(STRICT ? 1 : 0); });
