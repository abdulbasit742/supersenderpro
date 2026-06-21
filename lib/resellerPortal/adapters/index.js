'use strict';
/** Read-only adapters to existing modules. Each returns { available:false } if missing; never mutates, never calls
external APIs, never exposes secrets/full PII. */
const path = require('path');
function tryRequire(rels) { for (const r of rels) { try { return require(path.resolve(process.cwd(), r)); } catch {} }
return null; }
function safe(fn, fb) { try { return fn(); } catch { return fb; } }
const supportHelpdesk = tryRequire(['lib/supportHelpdesk/ticketRegistry']);
const pilotOps = tryRequire(['lib/pilotOps/pilotRegistry']);
const kpiCommand = tryRequire(['lib/kpiCommand/kpiAggregator', 'lib/kpiCommand/index']);

module.exports = {
  supportHelpdesk: { summary: () => supportHelpdesk ? { available: true, openTickets: safe(() =>
supportHelpdesk.list().filter((t) => !['resolved','archived'].includes(t.status)).length, 0) } : { available: false } },
  pilotOps: { summary: () => pilotOps ? { available: true, pilots: safe(() => (pilotOps.list ? pilotOps.list().length :
0), 0) } : { available: false } },
     publicFunnel: { summary: () => ({ available: !!tryRequire(['lib/publicSaasFunnel']) }) },
     saasBilling: { summary: () => ({ available: !!tryRequire(['lib/saasBilling/index', 'src/modules/billing']) }) },
     businessSetup: { summary: () => ({ available: !!tryRequire(['lib/businessSetup/profileManager']) }) },
     kpiCommand: { summary: () => kpiCommand ? { available: true } : { available: false } },
  compliance: { summary: () => ({ available: !!tryRequire(['lib/complianceCenter/complianceGuard',
'src/modules/compliance/compliance']) }) },
};
