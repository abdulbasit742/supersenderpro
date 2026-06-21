 // lib/superflow/store.js
 // SuperFlow Studio - JSON-file storage for flows. No DB required; app runs even
 // if the data file does not exist yet. No secrets stored.


 'use strict';


 const fs = require('fs');
 const path = require('path');
 const crypto = require('crypto');

 const DATA_DIR = process.env.SUPERFLOW_DATA_DIR || path.join(process.cwd(), 'data');
 const STORE_PATH = path.join(DATA_DIR, 'superflow.json');

 function ensure() {


   try {
     if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
     if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ flows: {} }, null, 2));
   } catch (_) { /* non-fatal: read() falls back to empty */ }
}


function readAll() {
   ensure();
   try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
   catch (_) { return { flows: {} }; }
}


function writeAll(db) {
   ensure();
   try { fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2)); return true; }
   catch (_) { return false; }
}


function genId() { return 'flow_' + crypto.randomBytes(6).toString('hex'); }
const nowMs = () => Date.now();

function listFlows() {
 const db = readAll();
   return Object.values(db.flows).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}


function getFlow(id) {
   const db = readAll();
   return db.flows[String(id)] || null;
}

function createFlow(flow) {
 const db = readAll();
   flow = flow || {};
   const id = flow.id && !db.flows[flow.id] ? flow.id : genId();
   const rec = {
     id,
     name: flow.name || 'Untitled flow',
     description: flow.description || '',
     enabled: flow.enabled === true,
     nodes: Array.isArray(flow.nodes) ? flow.nodes : [],
     edges: Array.isArray(flow.edges) ? flow.edges : [],
     meta: flow.meta || {},
     createdAt: nowMs(),
     updatedAt: nowMs(),
   };
   db.flows[id] = rec;
   writeAll(db);
   return rec;
}


function updateFlow(id, patch) {
 const db = readAll();
   const cur = db.flows[String(id)];
   if (!cur) return null;
   patch = patch || {};
   const next = {


       ...cur,
       name: patch.name != null ? patch.name : cur.name,
       description: patch.description != null ? patch.description : cur.description,
       enabled: typeof patch.enabled === 'boolean' ? patch.enabled : cur.enabled,
       nodes: Array.isArray(patch.nodes) ? patch.nodes : cur.nodes,
       edges: Array.isArray(patch.edges) ? patch.edges : cur.edges,
       updatedAt: nowMs(),
      };
      db.flows[String(id)] = next;
      writeAll(db);
      return next;
 }


 function deleteFlow(id) {
   const db = readAll();
      const existed = !!db.flows[String(id)];
      delete db.flows[String(id)];
      writeAll(db);
      return existed;
 }


 function duplicateFlow(id) {
   const src = getFlow(id);
      if (!src) return null;
      return createFlow({ ...src, id: undefined, name: `${src.name} (copy)`, enabled: false });
 }

 function toggleFlow(id, enabled) {
   const cur = getFlow(id);
      if (!cur) return null;
      return updateFlow(id, { enabled: typeof enabled === 'boolean' ? enabled : !cur.enabled });
 }


 function stats() {
   const flows = listFlows();
      return { flows: flows.length, enabled: flows.filter((f) => f.enabled).length };
 }

 module.exports = { listFlows, getFlow, createFlow, updateFlow, deleteFlow, duplicateFlow, toggleFlow, stats, genId,
 STORE_PATH };
