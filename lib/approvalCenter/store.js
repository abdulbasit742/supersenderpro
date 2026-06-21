  'use strict';

  /** Approval Center — JSON store for requests + policies + audit. */

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');


  const ROOT = process.cwd();
  function abs(p, fb) { const r = (p && String(p).trim()) || fb; return path.isAbsolute(r) ? r : path.resolve(ROOT, r); }


  const PATHS = {
    requests: abs(process.env.APPROVAL_REQUESTS_PATH, 'data/approval-requests.json'),
       policies: abs(process.env.APPROVAL_POLICIES_PATH, 'data/approval-policies.json'),
       audit: abs(process.env.APPROVAL_AUDIT_PATH, 'data/approval-audit.json'),
  };


  function readJson(p, fb) { try { if (!fs.existsSync(p)) return fb; const raw = fs.readFileSync(p, 'utf8'); return
  raw.trim() ? JSON.parse(raw) : fb; } catch (_e) { return fb; } }
  function writeJson(p, data) { const dir = path.dirname(p); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); const tmp = p + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, p); }
  function genId(prefix) { return (prefix || 'id') + '_' + crypto.randomBytes(6).toString('hex'); }

  function readRequests() { const d = readJson(PATHS.requests, { requests: [] }); return Array.isArray(d.requests) ?
  d.requests : []; }
  function writeRequests(items) { writeJson(PATHS.requests, { requests: items, updatedAt: new Date().toISOString() }); }
  function readPolicies() { const d = readJson(PATHS.policies, { policies: [] }); return Array.isArray(d.policies) ?
  d.policies : []; }
  function writePolicies(items) { writeJson(PATHS.policies, { policies: items, updatedAt: new Date().toISOString() }); }


  module.exports = { PATHS, readJson, writeJson, genId, readRequests, writeRequests, readPolicies, writePolicies, ROOT };
