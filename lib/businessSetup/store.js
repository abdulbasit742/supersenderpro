const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STORE_PATH = process.env.BUSINESS_SETUP_STORE_PATH || 'data/business-setup.json';
const PROFILE_PATH = process.env.BUSINESS_SETUP_PROFILE_PATH || 'data/business-profile.json';
const HISTORY_PATH = process.env.BUSINESS_SETUP_HISTORY_PATH || 'data/business-setup-history.json';

const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);

function emptyState() { return { checklist: {}, readiness: null, version: 1 }; }


function readJson(p, fallback) {
     try { return JSON.parse(fs.readFileSync(abs(p), 'utf8')); } catch { return fallback; }
}
function writeJson(p, data) {
  try { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); } catch {}
     fs.writeFileSync(abs(p), JSON.stringify(data, null, 2), 'utf8');
}


// ---- PII masking ----
function maskValue(v) {
  if (v == null) return v;
     let s = String(v);
     s = s.replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi, '$1***@$2***.$3');
     s = s.replace(/\b(\d[\d\s-]{5,})(\d{4})\b/g, (_m, _a, last) => '****' + last);
     s = s.replace(/(bearer\s+)[a-z0-9._-]{8,}/gi, '$1[redacted]');
     s = s.replace(/\b(sk-[a-z0-9]{6,})\b/gi, '[redacted-key]');
     return s;
}
function maskPhone(v) {
     if (!v) return v;
     const digits = String(v).replace(/\D/g, '');
     if (digits.length < 4) return '****';
     return '****' + digits.slice(-4);
}
function maskDeep(obj) {
     if (obj == null) return obj;
     if (typeof obj === 'string') return maskValue(obj);
     if (Array.isArray(obj)) return obj.map(maskDeep);
     if (typeof obj === 'object') {

     const out = {};
     for (const k of Object.keys(obj)) {
       if (/token|secret|apikey|api_key|password/i.test(k)) { out[k] = '[redacted]'; continue; }
       if (/phone/i.test(k)) { out[k] = maskPhone(obj[k]); continue; }
       out[k] = maskDeep(obj[k]);
     }
     return out;
    }
    return obj;
}

function loadState() { return readJson(STORE_PATH, emptyState()); }
function saveState(s) { writeJson(STORE_PATH, s); return s; }
function loadProfile() { return readJson(PROFILE_PATH, null); }
function saveProfile(p) { writeJson(PROFILE_PATH, maskDeep(p)); return readJson(PROFILE_PATH, null); }


function appendHistory(entry) {
    const hist = readJson(HISTORY_PATH, []);
    hist.push(Object.assign({ at: new Date().toISOString() }, maskDeep(entry)));
    writeJson(HISTORY_PATH, hist.slice(-2000));
}
function readHistory(limit = 200) { return readJson(HISTORY_PATH, []).slice(-limit).reverse(); }


module.exports = {
 emptyState, loadState, saveState, loadProfile, saveProfile,
    appendHistory, readHistory, maskValue, maskPhone, maskDeep,
    paths: { STORE_PATH, PROFILE_PATH, HISTORY_PATH },
};
