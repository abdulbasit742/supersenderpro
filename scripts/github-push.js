  'use strict';

  /**
   * Optional: commit synced files to GitHub via the API AND open a Pull Request.
   * Used by clickup-sync.js when you pass --push. Commits to GITHUB_BRANCH
   * (NOT main), then opens a PR from that branch into the repo default branch.
   * Never force-pushes, never merges. You review + merge the PR yourself.
   *
   * Env (.env, never commit):
   *     GITHUB_TOKEN, GITHUB_REPO (owner/repo), GITHUB_BRANCH (default: clickup-sync)
   *     GITHUB_PR_BASE (optional: base branch for the PR; defaults to repo default)
   *     GITHUB_PR_TITLE (optional), GITHUB_OPEN_PR (default: true)
   */

  const fs = require('fs');
  const https = require('https');


  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO;
  const BRANCH = process.env.GITHUB_BRANCH || 'clickup-sync';
  const OPEN_PR = String(process.env.GITHUB_OPEN_PR || 'true').toLowerCase() !== 'false';

  function gh(method, pathPart, body) {
       return new Promise(function (resolve, reject) {
         const payload = body ? JSON.stringify(body) : null;
        const req = https.request({
          host: 'api.github.com',
          path: '/repos/' + REPO + pathPart,
          method: method,
          headers: {
            'Authorization': 'Bearer ' + TOKEN,
             'Accept': 'application/vnd.github+json',
             'User-Agent': 'supersender-clickup-sync',
             'Content-Type': 'application/json'
          },
          timeout: 15000
        }, function (res) {
          let data = '';
          res.on('data', function (c) { data += c; });
          res.on('end', function () {
            let json = null; try { json = JSON.parse(data || '{}'); } catch (_e) {}
          if (res.statusCode >= 400) return reject(new Error('github_' + res.statusCode + ': ' + (json && json.message ?
  json.message : data.slice(0, 200))));
            resolve(json || {});
          });
        });
        req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });


     req.on('error', reject);
     if (payload) req.write(payload);
     req.end();
   });
}

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

async function repoDefaultBranch() {
   const repo = await gh('GET', '');
   return repo.default_branch || 'main';
}

async function ensureBranch() {
 try { await gh('GET', '/git/ref/heads/' + encodeURIComponent(BRANCH)); return; }
   catch (_e) { /* create it */ }
   const base = await repoDefaultBranch();
   const baseRef = await gh('GET', '/git/ref/heads/' + encodeURIComponent(base));
   await gh('POST', '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: baseRef.object.sha });
   console.log('[push] created branch ' + BRANCH + ' off ' + base);
}

async function putFile(relPath, content) {
   let sha = null;
   try {
     const existing = await gh('GET', '/contents/' + encodeURI(relPath) + '?ref=' + encodeURIComponent(BRANCH));
     sha = existing && existing.sha ? existing.sha : null;
   } catch (_e) { /* new file */ }
   await gh('PUT', '/contents/' + encodeURI(relPath), {
     message: 'clickup-sync: update ' + relPath,
     content: b64(content),
     branch: BRANCH,
     sha: sha || undefined
   });
}

// Find an existing open PR for this branch, else create one. Never merges.
async function openPullRequest(fileCount) {
 const base = process.env.GITHUB_PR_BASE || await repoDefaultBranch();
   // already open?
   try {
   const existing = await gh('GET', '/pulls?state=open&head=' + encodeURIComponent(REPO.split('/')[0] + ':' + BRANCH) +
'&base=' + encodeURIComponent(base));
     if (Array.isArray(existing) && existing.length) {
       console.log('[push] PR already open: ' + existing[0].html_url);
         return existing[0];
     }
   } catch (_e) { /* fall through to create */ }

   const title = process.env.GITHUB_PR_TITLE || ('ClickUp sync: ' + fileCount + ' file(s) updated');
   const bodyText = [
     'Automated sync from ClickUp docs.',
     '',
     '- ' + fileCount + ' file(s) written to `' + BRANCH + '`.',
     '- Review the diff before merging.',
     '- Hooks (server.js, .env, etc.) are NOT auto-applied; apply marked blocks by hand.',
     '',


         '_Opened by scripts/github-push.js. No force-push, no auto-merge._'
   ].join('\n ');


     try {
         const pr = await gh('POST', '/pulls', { title: title, head: BRANCH, base: base, body: bodyText });
         console.log('[push] opened PR: ' + pr.html_url);
       return pr;
     } catch (e) {
         // common case: no commits between branches yet, or PR creation disabled
         console.warn('[push] could not open PR: ' + e.message);
         return null;
     }
 }


 async function push(relPaths) {
   if (!TOKEN || !REPO) { console.warn('[push] GITHUB_TOKEN/GITHUB_REPO not set; skipping push.'); return; }
     await ensureBranch();
     for (const rel of relPaths) {
         const content = fs.readFileSync(rel, 'utf8');
         await putFile(rel, content);
         console.log('[push] committed ' + rel + ' -> ' + BRANCH);
     }
     let pr = null;
     if (OPEN_PR && relPaths.length) {
         pr = await openPullRequest(relPaths.length);
     }
   console.log('[push] done. ' + (pr ? ('Review + merge: ' + pr.html_url) : ('Open a PR from ' + BRANCH + ' when\n ready.')));
     return pr;
 }


 module.exports = { push, openPullRequest };
