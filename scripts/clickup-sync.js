  'use strict';

  /**
   * ClickUp -> Repo sync.
   * Reads module docs via the ClickUp API, extracts the code block from each
   * file-path-titled page, and writes it to that path in the repo.
   *
   *     node scripts/clickup-sync.js             # DRY RUN (lists files)
   *     node scripts/clickup-sync.js --write     # writes files
   *     node scripts/clickup-sync.js --write --push     # + commits via github-push.js
   *
   * Built-ins only. Token from env (CLICKUP_API_TOKEN, CLICKUP_WORKSPACE_ID).
   * Skips hook/patch pages. Never overwrites a file with uncommitted git changes.
   */

  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  const { execFileSync } = require('child_process');


  const WRITE = process.argv.indexOf('--write') !== -1;
  const PUSH = process.argv.indexOf('--push') !== -1;


  const TOKEN = process.env.CLICKUP_API_TOKEN;
  const WORKSPACE = process.env.CLICKUP_WORKSPACE_ID;
  const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'clickup-sync.config.json'), 'utf8'));


  function die(msg) { console.error('[sync] ' + msg); process.exit(1); }
  if (!TOKEN) die('CLICKUP_API_TOKEN missing in env (.env).');
  if (!WORKSPACE) die('CLICKUP_WORKSPACE_ID missing in env (.env).');

  // ---- ClickUp API (v3 docs) ----
  function api(pathPart) {
       return new Promise(function (resolve, reject) {
         const req = https.request({
          host: 'api.clickup.com',
          path: '/api/v3/workspaces/' + WORKSPACE + pathPart,
          method: 'GET',
          headers: { 'Authorization': TOKEN, 'Accept': 'application/json' },
          timeout: 15000
        }, function (res) {
          let data = '';
          res.on('data', function (c) { data += c; });
          res.on('end', function () {
            if (res.statusCode >= 400) return reject(new Error('clickup_' + res.statusCode + ': ' + data.slice(0, 200)));
            try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
          });


     });
     req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
     req.on('error', reject);
      req.end();
    });
}


function docIdFrom(idOrUrl) {
 const m = String(idOrUrl).match(/docs\/([A-Za-z0-9-]+)/);
    return m ? m[1] : String(idOrUrl);
}

// Pull all pages of a doc (listing endpoint returns pages w/ content).
async function getPages(docId) {
 const res = await api('/docs/' + docId + '/pages');
    // API returns an array of pages (each with id, name, content).
    return Array.isArray(res) ? res : (res.pages || []);
}


// ---- extraction ----
function looksLikePath(title) {
    const t = String(title || '').trim();
    if (CONFIG.skipTitlePatterns.some(function (p) { return t.toLowerCase().indexOf(p) !== -1; })) return false;
    // must contain a slash or a dot-extension and end in an allowed ext
    const ext = path.extname(t).toLowerCase();
    if (CONFIG.allowedExtensions.indexOf(ext) === -1) return false;
    return /[\/]/.test(t) || ext.length > 0;
}


// Page content may begin with "FILE: path" then a fenced block. Extract the
// first fenced code block; fall back to stripping a leading FILE: line.
function extractCode(content) {
 if (!content) return null;
 const fence = content.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/);
    if (fence) return fence[1].replace(/\s+$/, '') + '\n';
    return null;
}


// normalize the file path from the title (handles "FILE: x" titles too)
function pathFromTitle(title) {
 let t = String(title || '').trim();
    t = t.replace(/^FILE:\s*/i, '').trim();
    // take the first token that looks like a path
    const tok = t.split(/\s+/)[0];
    return tok;
}

function hasUncommittedChanges(file) {
 try {
     const out = execFileSync('git', ['status', '--porcelain', '--', file], { encoding: 'utf8' });
     return out.trim().length > 0;
    } catch (_e) { return false; } // not a git repo / git missing -> don't block
}

async function main() {


   let planned = [];
   for (const d of CONFIG.docs) {
     const id = docIdFrom(d.docId);
       if (/REPLACE_WITH/.test(id)) { console.warn('[sync] skip ' + d.name + ': docId not set'); continue; }
       let pages;
       try { pages = await getPages(id); }
       catch (e) { console.error('[sync] ' + d.name + ' fetch failed: ' + e.message); continue; }


       for (const pg of pages) {
           const title = pg.name || pg.title || '';
           if (!looksLikePath(title)) continue;
           const rel = pathFromTitle(title);
           const code = extractCode(pg.content || '');
           if (!code) { console.warn('[sync] ' + d.name + ': no code block in "' + title + '"'); continue; }
           planned.push({ doc: d.name, rel: rel, bytes: code.length, code: code });
       }
   }


   if (!planned.length) die('Nothing to write. Set real docIds in clickup-sync.config.json.');

   console.log('\n[sync] ' + planned.length + ' file(s) ' + (WRITE ? 'to WRITE' : 'in DRY RUN') + ':');
 const written = [];
   for (const p of planned) {
     const abs = path.resolve(CONFIG.writeRoot, p.rel);
       const exists = fs.existsSync(abs);
       if (WRITE && exists && hasUncommittedChanges(p.rel)) {
           console.warn('   SKIP (uncommitted changes): ' + p.rel);
           continue;
       }
       console.log('    ' + (WRITE ? 'write' : 'would write') + ' ' + p.rel + '   (' + p.bytes + 'b)' + (exists ? '\n[overwrite]' : ' [new]'));
   if (WRITE) {
           fs.mkdirSync(path.dirname(abs), { recursive: true });
           fs.writeFileSync(abs, p.code, 'utf8');
           written.push(p.rel);
       }
   }


 if (WRITE) console.log('\n[sync] wrote ' + written.length + ' file(s).');
 else console.log('\n[sync] dry run only. Re-run with --write to apply.');


   if (WRITE && PUSH) {
       try {
         require('./github-push').push(written);
       } catch (e) {
         console.error('[sync] push step failed: ' + e.message);
       }
   }
}

main().catch(function (e) { die(e.message); });




scripts/github-push.js (optional)
