 'use strict';
 /**
  * moduleLinker.js — fault-tolerant read-only bridges to existing modules. Each
  * getter returns { available, ... } and NEVER throws or mutates. Used by the
  * per-area previews; if a module is absent, the preview falls back to the
  * customer's stored status label. */ function tryRequire(rels) { for (const r of rels) { try { return require(r); } catch (e) { /* next */ } } return null; } function probe(rels) { const m = tryRequire(rels); return { available: !!m, mod: m }; } module.exports = { customer360: () => probe(['../customer360', '../../src/modules/customer360']), booking: () => probe(['../bookingCenter']), loyalty: () => probe(['../loyaltyCenter']), receivables: () => probe(['../receivablesCenter']), helpdesk: () => probe(['../supportHelpdesk']), quality: () => probe(['../qualityCenter']),
      contract: () => probe(['../contractCenter']),
      documentVault: () => probe(['../documentVault']),
      tryRequire,
 };
