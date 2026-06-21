 'use strict';
 const b = require('./_base');
 function leads() {
   if (!b.anyExists(['src/modules/funnel', 'lib/publicFunnel', 'routes/funnelRoutes.js'])) return b.unavailable('Public Funnel');
     return b.ok('Public funnel present', { note: 'Lead counts read-only; PII masked by caller.' });
 }
 module.exports = { leads, health: leads };
