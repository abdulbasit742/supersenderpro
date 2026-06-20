// developerPortal/adapters/auditLedgerAdapter.js — safe adapter for Audit Ledger.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Audit Ledger', detectFiles:['server.js'], events:['audit.event_recorded'] });
