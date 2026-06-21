// lib/platformControl/config.js
   // Shared, read-only helpers + safety constants for Platform Control.
   // No writes. No external calls. No secret values ever returned.
   'use strict';

   const fs = require('fs');
   const path = require('path');

   const PROJECT_ROOT = process.env.PLATFORM_CONTROL_ROOT || process.cwd();

   // Canonical safety flags attached to every response.
   const SAFETY = {
     ok: true,
        dryRun: true,
        readOnly: true,
        liveActionsEnabled: false,
        externalCallsEnabled: false,
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

   function readJSON(rel) {

    const t = readSafe(rel);
    if (!t) return null;
    try { return JSON.parse(t); } catch (_) { return null; }
}

function listDir(rel) { try { return fs.readdirSync(abs(rel)); } catch (_) { return []; } }


// Recursive file walk. Read-only, depth-limited, skips heavy/sensitive dirs.
function walk(rel, opts) {
    opts = opts || {};
    const maxDepth = opts.maxDepth == null ? 6 : opts.maxDepth;
    const exts = opts.exts || null;
    const skip = new Set(opts.skip || ['node_modules', '.git', '.cache', 'tmp', 'coverage', '.next', 'dist']);
    const out = [];
    function rec(curRel, depth) {
     if (depth > maxDepth) return;
     let entries = [];
     try { entries = fs.readdirSync(abs(curRel), { withFileTypes: true }); } catch (_) { return; }
     for (const e of entries) {
         if (skip.has(e.name)) continue;
         const childRel = curRel ? path.join(curRel, e.name) : e.name;
         if (e.isDirectory()) rec(childRel, depth + 1);
         else if (e.isFile()) {
             if (exts && !exts.includes(path.extname(e.name))) continue;
             out.push(childRel.split(path.sep).join('/'));
         }
     }
    }
    if (exists(rel)) rec(rel, 0);
    return out;
}

function findFiles(patterns, opts) {
    const files = walk('', Object.assign({ exts: ['.js'], maxDepth: 4 }, opts || {}));
    return files.filter((f) => patterns.some((p) => p.test(f)));
}


function hasFile(patterns, opts) { return findFiles(patterns, opts).length > 0; }

// Returns ENV KEY NAMES only (never values). Reads process.env + .env keys.
function envKeyNames() {
    const keys = new Set(Object.keys(process.env));
    const raw = readSafe('.env');
    if (raw) {
      raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
       if (m) keys.add(m[1]);
     });
    }
    return Array.from(keys);
}

function hasEnv(key) { return envKeyNames().includes(key); }


// App must boot without these; PORT has a default elsewhere, so nothing is hard-required.
const REQUIRED_ENV_KEYS = [];

  const OPTIONAL_ENV_KEYS = ['PORT', 'NODE_ENV', 'OLLAMA_BASE_URL', 'DATA_DIR', 'WEBHOOK_VERIFY_TOKEN'];
  const SECRET_KEYS = [
    'META_ACCESS_TOKEN', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'WHATSAPP_CLOUD_TOKEN',
       'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'GROQ_API_KEY',
       'JAZZCASH_KEY', 'EASYPAISA_KEY', 'STRIPE_SECRET_KEY', 'PAYPAL_SECRET',
       'REDIS_URL', 'DATABASE_URL', 'MONGODB_URI', 'SESSION_SECRET', 'JWT_SECRET',
  ];


  module.exports = {
       PROJECT_ROOT, SAFETY, base, abs, exists, isDir, readSafe, readJSON, listDir, walk,
       findFiles, hasFile, envKeyNames, hasEnv, REQUIRED_ENV_KEYS, OPTIONAL_ENV_KEYS, SECRET_KEYS,
  };
