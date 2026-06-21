 'use strict';
 /**
  * responseStore.js — JSON-backed capture of completed form responses. Masks
     * phone/email at write time. Degrades to in-memory. Preview/sample data only.
     */
 const fs = require('fs');
 const path = require('path');
 const redactor = require('./redactor');
 const FILE = path.join(process.cwd(), 'data', 'whatsapp-flow-responses.json');


 let mem = null;
 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 responses: [] }; } if (!mem.responses) mem.responses = []; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }

 function maskAnswers(answers) {
      const out = {};
      Object.keys(answers || {}).forEach((k) => { out[k] = redactor.maskValueByName(k, answers[k]); });
      return out;
 }

 function add(flowId, answers) {
      const d = load();
      const rec = { id: 'resp_' + Math.random().toString(36).slice(2, 9), flowId, answersMasked: maskAnswers(answers),
 capturedAt: new Date().toISOString(), dryRun: true };
   d.responses.unshift(rec);
      persist();
      return rec;
 }
 function list(flowId, limit) { const d = load(); return d.responses.filter((r) => !flowId || r.flowId ===
 flowId).slice(0, limit || 50); }
 module.exports = { add, list, maskAnswers, FILE };
