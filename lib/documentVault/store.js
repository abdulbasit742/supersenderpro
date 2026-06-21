 'use strict';
 /**
  * store.js — JSON-backed document METADATA store. Masks owner/file refs at write.
     * Never stores file contents. Degrades to in-memory. No secrets persisted.
     */
 const fs = require('fs');
 const path = require('path');
 const redactor = require('./metadataRedactor');
 const FILE = path.join(process.cwd(), 'data', 'document-vault.json');

 let mem = null;
 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 documents: {} }; } if (!mem.documents) mem.documents = {}; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
 function all() { return Object.values(load().documents); }
 function get(id) { return load().documents[id] || null; }
 function put(d) {
   const db = load();
      const safe = Object.assign({}, d, {
        ownerSafe: redactor.maskName(d.owner || d.ownerSafe),
        fileNameSafe: redactor.maskFileName(d.fileName || d.fileNameSafe),
        linkedRecordLabelSafe: d.linkedRecordLabelSafe || (d.linkedRecordLabel ? redactor.maskRef(d.linkedRecordLabel) :
 null),
     redactedOnly: true,
      });
      delete safe.owner; delete safe.fileName; delete safe.fileContent; delete safe.raw; delete safe.linkedRecordLabel;
      db.documents[d.id] = safe; persist(); return db.documents[d.id];
 }
 function bulkPut(list) { (list || []).forEach(put); return all().length; }
 module.exports = { all, get, put, bulkPut, FILE };
