// lib/workflowOrchestrator/config.js
   // Shared read-only helpers + canonical safety flags. No writes, no external calls.
   'use strict';

   const fs = require('fs');
   const path = require('path');


   const PROJECT_ROOT = process.env.WORKFLOW_ORCHESTRATOR_ROOT || process.cwd();

   // Canonical safety flags attached to every response.
   const SAFETY = {
        ok: true,
        dryRun: true,
        previewOnly: true,
        simulationOnly: true,
        liveActionsEnabled: false,
        externalCallsEnabled: false,
        liveAiCall: false,
        liveSend: false,
        liveDbMutation: false,
        piiMasked: true,
        secretsExposed: false,
   };


   function base(extra) {
        return Object.assign({}, SAFETY, { warnings: [], blockers: [] }, extra || {});
   }

   function abs(rel) { return path.join(PROJECT_ROOT, rel); }
   function exists(rel) { try { return fs.existsSync(abs(rel)); } catch (_) { return false; } }

  function isDir(rel) { try { return fs.statSync(abs(rel)).isDirectory(); } catch (_) { return false; } }
  function readSafe(rel) { try { return fs.readFileSync(abs(rel), 'utf8'); } catch (_) { return null; } }
  function readJSON(rel) { const t = readSafe(rel); if (!t) return null; try { return JSON.parse(t); } catch (_) { return
  null; } }
  function listDir(rel) { try { return fs.readdirSync(abs(rel)); } catch (_) { return []; } }

  function walk(rel, opts) {
      opts = opts || {};
      const maxDepth = opts.maxDepth == null ? 4 : opts.maxDepth;
      const exts = opts.exts || null;
      const skip = new Set(opts.skip || ['node_modules', '.git', '.cache', 'tmp', 'coverage', 'dist']);
      const out = [];
      function rec(curRel, depth) {
       if (depth > maxDepth) return;
       let entries = [];
       try { entries = fs.readdirSync(abs(curRel), { withFileTypes: true }); } catch (_) { return; }
       for (const e of entries) {
         if (skip.has(e.name)) continue;
         const childRel = curRel ? path.join(curRel, e.name) : e.name;
         if (e.isDirectory()) rec(childRel, depth + 1);
         else if (e.isFile()) { if (exts && !exts.includes(path.extname(e.name))) continue;
  out.push(childRel.split(path.sep).join('/')); }
      }
      }
      if (exists(rel)) rec(rel, 0);
      return out;
  }

  function findFiles(patterns, opts) {
      const files = walk('lib', Object.assign({ exts: ['.js'], maxDepth: 3 }, opts || {}));
      return files.filter((f) => patterns.some((p) => p.test(f)));
  }
  function hasFile(patterns, opts) { return findFiles(patterns, opts).length > 0; }


  function envKeyNames() {
      const keys = new Set(Object.keys(process.env));
      const raw = readSafe('.env');
    if (raw) raw.split(/\r?\n/).forEach((line) => { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/); if (m) keys.add(m[1]); });
      return Array.from(keys);
  }
  function hasEnv(key) { return envKeyNames().includes(key); }


  module.exports = { PROJECT_ROOT, SAFETY, base, abs, exists, isDir, readSafe, readJSON, listDir, walk, findFiles, hasFile,
  envKeyNames, hasEnv };
