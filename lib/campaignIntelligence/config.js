// lib/campaignIntelligence/config.js — shared read-only helpers + canonical safety flags.
   'use strict';
   const fs = require('fs');
   const path = require('path');

   const PROJECT_ROOT = process.env.CAMPAIGN_INTELLIGENCE_ROOT || process.cwd();


   const SAFETY = {
     ok: true,
        dryRun: true,
        previewOnly: true,
        analyticsOnly: true,
        liveActionsEnabled: false,
        externalCallsEnabled: false,
        liveSend: false,
        liveAiCall: false,
        liveDbMutation: false,
        piiMasked: true,
        secretsExposed: false,
   };

   function base(extra) { return Object.assign({}, SAFETY, { warnings: [], blockers: [] }, extra || {}); }
   function abs(rel) { return path.join(PROJECT_ROOT, rel); }
   function exists(rel) { try { return fs.existsSync(abs(rel)); } catch (_) { return false; } }
   function readSafe(rel) { try { return fs.readFileSync(abs(rel), 'utf8'); } catch (_) { return null; } }
   function readJSON(rel) { const t = readSafe(rel); if (!t) return null; try { return JSON.parse(t); } catch (_) { return
   null; } }
   function listDir(rel) { try { return fs.readdirSync(abs(rel)); } catch (_) { return []; } }

   function walk(rel, opts) {

       opts = opts || {};
       const maxDepth = opts.maxDepth == null ? 3 : opts.maxDepth;
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
  function findFiles(patterns, opts) { return walk('lib', Object.assign({ exts: ['.js'], maxDepth: 3 }, opts ||
  {})).filter((f) => patterns.some((p) => p.test(f))); }
  function hasFile(patterns, opts) { return findFiles(patterns, opts).length > 0; }


  // Deterministic pseudo-random so previews are stable per-seed (no Math.random in analytics).
  function seeded(seed) { let s = 0; const str = String(seed || 'seed'); for (let i = 0; i < str.length; i++) s = (s * 31 +
  str.charCodeAt(i)) >>> 0; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

  module.exports = { PROJECT_ROOT, SAFETY, base, abs, exists, readSafe, readJSON, listDir, walk, findFiles, hasFile, seeded
  };
