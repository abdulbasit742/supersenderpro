 'use strict';


 /**
  * No-Code Flows — flow CRUD + normalization. Drag/drop-friendly JSON structure.
  */

 const crypto = require('crypto');
 const store = require('./store');
 const registry = require('./nodeRegistry');

 const STATUSES = ['draft', 'active', 'paused', 'archived'];

 function id() { return 'flow_' + crypto.randomBytes(7).toString('hex'); }
 function nodeId() { return 'node_' + crypto.randomBytes(5).toString('hex'); }
 function now() { return new Date().toISOString(); }


 function normalizeNode(n) {
   const node = n || {};
   const type = registry.isValidType(node.type) ? node.type : 'end';
   return {

      id: node.id || nodeId(),
      type: type,
      label: node.label ? String(node.label).slice(0, 80) : registry.label(type),
      config: node.config && typeof node.config === 'object' ? node.config : {},
      position: node.position && typeof node.position === 'object' ? { x: Number(node.position.x) || 0, y:
Number(node.position.y) || 0 } : { x: 0, y: 0 },
  };
}

function normalizeEdge(e) {
  const edge = e || {};
  return { id: edge.id || ('edge_' + crypto.randomBytes(4).toString('hex')), from: edge.from || null, to: edge.to ||
null, condition: edge.condition || null };
}


function normalize(input) {
  const i = input || {};
    return {
      id: i.id || id(),
      name: i.name ? String(i.name).slice(0, 120) : 'Untitled flow',
      description: i.description ? String(i.description).slice(0, 400) : '',
      status: STATUSES.indexOf(i.status) !== -1 ? i.status : 'draft',
      trigger: i.trigger && typeof i.trigger === 'object' ? normalizeNode(i.trigger) : (i.trigger ? normalizeNode({ type:
i.trigger }) : null),
    nodes: Array.isArray(i.nodes) ? i.nodes.slice(0, 200).map(normalizeNode) : [],
      edges: Array.isArray(i.edges) ? i.edges.slice(0, 400).map(normalizeEdge) : [],
      tags: Array.isArray(i.tags) ? i.tags.slice(0, 30).map(function (t) { return String(t).slice(0, 40); }) : [],
      dryRun: true,
      createdAt: i.createdAt || now(),
      updatedAt: now(),
    };
}


function create(input) { const db = store.read(); const rec = normalize(input); db.flows.push(rec); store.write(db);
return rec; }
function list() { return store.read().flows.slice(); }
function get(fid) { return store.read().flows.find(function (f) { return f.id === fid; }) || null; }
function update(fid, patch) {
  const db = store.read();
    const idx = db.flows.findIndex(function (f) { return f.id === fid; });
    if (idx === -1) return null;
  db.flows[idx] = normalize(Object.assign({}, db.flows[idx], patch || {}, { id: fid, createdAt: db.flows[idx].createdAt
}));
    store.write(db);
    return db.flows[idx];
}
function remove(fid) { const db = store.read(); const before = db.flows.length; db.flows = db.flows.filter(function (f) {
return f.id !== fid; }); store.write(db); return before !== db.flows.length; }
function statusInfo() { return { path: store.STORE_PATH, writable: store.writable(), flows: store.read().flows.length };
}


module.exports = { STATUSES, normalize, normalizeNode, normalizeEdge, create, list, get, update, remove, statusInfo };
