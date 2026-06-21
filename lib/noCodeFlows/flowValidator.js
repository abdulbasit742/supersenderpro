'use strict';


/**
 * No-Code Flows — flow validator. Pure function. Checks structure, node config,
 * trigger presence, edge integrity, and reachability. Never executes anything.
 */

const registry = require('./nodeRegistry');

function validate(flow) {
  const f = flow || {};
  const errors = [], warnings = [];

  if (!f.name || !String(f.name).trim()) warnings.push('Flow has no name.');
  if (!f.trigger) errors.push('Flow has no trigger node.');
  else if (!registry.isValidType(f.trigger.type) || registry.get(f.trigger.type).category !== 'trigger')
errors.push('Trigger node type is invalid.');

  const nodes = Array.isArray(f.nodes) ? f.nodes : [];
  const edges = Array.isArray(f.edges) ? f.edges : [];
  if (!nodes.length) warnings.push('Flow has no action/condition nodes.');


  const nodeIds = {};
  nodes.forEach(function (n) {
    nodeIds[n.id] = true;
      if (!registry.isValidType(n.type)) errors.push('Unknown node type: ' + n.type);
      else {
          const def = registry.get(n.type);
          (def.requires || []).forEach(function (key) {
        if (!n.config || n.config[key] == null || String(n.config[key]).trim() === '') errors.push('Node ' + (n.label ||
n.type) + ' missing required config: ' + key);
          });
      }
  });

  // Edge integrity.
  edges.forEach(function (e) {
    if (e.from && !nodeIds[e.from] && (!f.trigger || e.from !== f.trigger.id)) warnings.push('Edge references unknown source node: ' + e.from);
    if (e.to && !nodeIds[e.to]) warnings.push('Edge references unknown target node: ' + e.to);
  });

  // Reachability: at least one edge from the trigger (if there are nodes).
  if (f.trigger && nodes.length) {
    const fromTrigger = edges.some(function (e) { return e.from === f.trigger.id; });
      if (!fromTrigger) warnings.push('No edge connects the trigger to any node.');
  }

    // End node recommended.
    if (nodes.length && !nodes.some(function (n) { return n.type === 'end'; })) warnings.push('Flow has no explicit end node.');

    return { ok: errors.length === 0, valid: errors.length === 0, errors: errors, warnings: warnings };
}

module.exports = { validate };
