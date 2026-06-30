'use strict';
/**
 * backupRestore.js — Ops Feature #2: backup + restore.
 *
 * One command to snapshot ALL of a workspace's data into a single portable file, and one to restore
 * it. Critical for disaster recovery, migrations, and giving customers their data. Built to be
 * decoupled: each department registers an exporter (() => data) and a restorer ((data) => void), so
 * this covers the whole system without importing every module.
 *
 * Safety: restore is DRY-RUN by default (returns what WOULD change); pass { apply:true } to commit.
 */

const SNAPSHOT_VERSION = 1;

const datasets = new Map(); // name -> { export: ()=>any, restore: (data)=>void }
function register(name, exportFn, restoreFn) {
  if (!name || typeof exportFn !== 'function') throw new Error('register needs name + export fn');
  datasets.set(name, { export: exportFn, restore: typeof restoreFn === 'function' ? restoreFn : null });
  return [...datasets.keys()];
}
function registered() { return [...datasets.keys()]; }

/** Build a single snapshot object of everything registered. */
function exportAll(meta = {}) {
  const data = {};
  const counts = {};
  for (const [name, ds] of datasets.entries()) {
    try {
      const v = ds.export();
      data[name] = v;
      counts[name] = Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 1);
    } catch (e) {
      data[name] = null;
      counts[name] = `error: ${e.message}`;
    }
  }
  return {
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    meta,
    counts,
    data
  };
}

/**
 * Restore from a snapshot.
 * @param {Object} snapshot  the object produced by exportAll
 * @param {Object} opts { apply?: boolean, only?: string[] }
 * @returns {Object} summary of what was (or would be) restored
 */
function importAll(snapshot, opts = {}) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.data) throw new Error('invalid snapshot');
  if (snapshot.version !== SNAPSHOT_VERSION) {
    // forward-compatible: warn but attempt
  }
  const only = Array.isArray(opts.only) && opts.only.length ? new Set(opts.only) : null;
  const apply = opts.apply === true;
  const plan = {};

  for (const [name, ds] of datasets.entries()) {
    if (only && !only.has(name)) continue;
    const incoming = snapshot.data[name];
    if (incoming === undefined) { plan[name] = 'absent in snapshot'; continue; }
    if (!ds.restore) { plan[name] = 'no restorer registered (skipped)'; continue; }
    if (!apply) {
      plan[name] = `would restore (${Array.isArray(incoming) ? incoming.length + ' rows' : 'object'})`;
      continue;
    }
    try { ds.restore(incoming); plan[name] = 'restored'; }
    catch (e) { plan[name] = `error: ${e.message}`; }
  }
  return { applied: apply, version: snapshot.version, createdAt: snapshot.createdAt, plan };
}

module.exports = { SNAPSHOT_VERSION, register, registered, exportAll, importAll };
