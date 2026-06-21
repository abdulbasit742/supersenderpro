 'use strict';
 /**
  * store.js — JSON-backed store for monitored AI replies. Masks phone/email at
     * write time. Degrades to in-memory if the file is unavailable. No real customer
     * data, no secrets persisted.
  */
 const fs = require('fs');
 const path = require('path');
 const FILE = path.join(process.cwd(), 'data', 'ai-agent-monitor.json');


 let mem = null;

 function maskValue(v) {
      let s = String(v == null ? '' : v);
      s = s.replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi, '$1***@$2***.$3');
      s = s.replace(/\b(\+?\d[\d\s-]{4,})(\d{2})\b/g, (m, _a, last) => '*** *** ' + last);
      return s;
 }
 function maskDeep(o) {
      if (o == null) return o;
      if (typeof o === 'string') return maskValue(o);
      if (Array.isArray(o)) return o.map(maskDeep);
      if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
 /token|secret|apikey|api_key|password/i.test(k) ? '[redacted]' : maskDeep(o[k]); return out; }
   return o;
 }

 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 replies: {} }; } if (!mem.replies) mem.replies = {}; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }

 function all() { return Object.values(load().replies); }
 function get(id) { return load().replies[id] || null; }
 function put(reply) { const d = load(); d.replies[reply.id] = maskDeep(reply); persist(); return d.replies[reply.id]; }


 module.exports = { all, get, put, maskValue, maskDeep, FILE };
