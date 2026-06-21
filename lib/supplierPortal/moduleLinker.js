  'use strict';
  /** moduleLinker.js — fault-tolerant read-only bridges to existing modules; never throws/mutates. */
  function tryRequire(rels) { for (const r of rels) { try { return require(r); } catch (e) { /* next */ } } return null; }
  function probe(rels) { const m = tryRequire(rels); return { available: !!m, mod: m }; }
  module.exports = {
       supplierPlanner: () => probe(['../supplierPlanner']),
       payables: () => probe(['../payablesCenter']),
       quality: () => probe(['../qualityCenter']),
       contract: () => probe(['../contractCenter']),
       documentVault: () => probe(['../documentVault']),
       tryRequire,
  };
