const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STORE_PATH = process.env.AGENT_DEPLOYMENT_STORE_PATH || 'data/agent-deployment.json';
const HISTORY_PATH = process.env.AGENT_DEPLOYMENT_HISTORY_PATH || 'data/agent-deployment-history.json';
const AUDIT_PATH = process.env.AGENT_DEPLOYMENT_AUDIT_PATH || 'data/agent-deployment-audit.json';

const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);


function emptyState() {
     return { agents: {}, deployments: {}, version: 1 };
}

function readJson(p, fallback) {
     try { return JSON.parse(fs.readFileSync(abs(p), 'utf8')); }
     catch { return fallback; }
}


function writeJson(p, data) {
  try { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); } catch {}
     fs.writeFileSync(abs(p), JSON.stringify(data, null, 2), 'utf8');
}

// ---- PII masking ----
function maskValue(v) {
  if (v == null) return v;
     let s = String(v);
     // emails -> a***@d***
     s = s.replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi, '$1***@$2***.$3');
     // long digit runs (phones) -> keep last 4
     s = s.replace(/\b(\d[\d\s-]{5,})(\d{4})\b/g, (m, _a, last) => '****' + last);
     // bearer / api-key-ish -> redacted
     s = s.replace(/(bearer\s+)[a-z0-9._-]{8,}/gi, '$1[redacted]');
     s = s.replace(/\b(sk-[a-z0-9]{6,})\b/gi, '[redacted-key]');
     return s;
}

function maskDeep(obj) {

    if (obj == null) return obj;
    if (typeof obj === 'string') return maskValue(obj);
    if (Array.isArray(obj)) return obj.map(maskDeep);
    if (typeof obj === 'object') {
      const out = {};
        for (const k of Object.keys(obj)) {
          if (/token|secret|apikey|api_key|password/i.test(k)) { out[k] = '[redacted]'; continue; }
            out[k] = maskDeep(obj[k]);
        }
        return out;
    }
    return obj;
}

// ---- state ----
function load() { return readJson(STORE_PATH, emptyState()); }
function save(state) { writeJson(STORE_PATH, state); return state; }

// ---- history + audit (append-only, masked) ----
function appendHistory(entry) {
 const hist = readJson(HISTORY_PATH, []);
    hist.push(Object.assign({ at: new Date().toISOString() }, maskDeep(entry)));
    writeJson(HISTORY_PATH, hist.slice(-2000));
}

function appendAudit(event) {
 const log = readJson(AUDIT_PATH, []);
    log.push(Object.assign({ at: new Date().toISOString() }, maskDeep(event)));
    writeJson(AUDIT_PATH, log.slice(-5000));
}

function readHistory(limit = 200) { return readJson(HISTORY_PATH, []).slice(-limit).reverse(); }
function readAudit(limit = 200) { return readJson(AUDIT_PATH, []).slice(-limit).reverse(); }


module.exports = {
    emptyState, load, save, appendHistory, appendAudit, readHistory, readAudit,
    maskValue, maskDeep,
    paths: { STORE_PATH, HISTORY_PATH, AUDIT_PATH },
};
