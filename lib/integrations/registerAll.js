  'use strict';

  /**
      * Master wiring for all NEW SuperSender Pro modules.
      * Call registerAll(app) once in server.js. Each mount is defensive: a missing
      * or throwing module is logged and skipped, never crashes boot.
      */

  function safeMount(app, label, mountPath, requirePath) {
       try {
         const routes = require(requirePath);
           app.use(mountPath, routes);
           console.log('[registerAll] mounted ' + label + ' at ' + mountPath);
         return true;
       } catch (e) {
      console.warn('[registerAll] skip ' + label + ' (' + (e && e.code === 'MODULE_NOT_FOUND' ? 'not present' : (e &&
  e.message)) + ')');
           return false;
       }
  }

  /**
   * @param {object} app       Express app
      * @returns {object} summary of what mounted/skipped
      */
  function registerAll(app) {
    const results = {};
       results.voiceAI          = safeMount(app, 'Voice AI',        '/api/voice-ai',        '../../routes/voiceAIRoutes');
       results.publicFunnel     = safeMount(app, 'Public Funnel',   '/api/public-funnel',
  '../../routes/publicSaasFunnelRoutes');
    results.customer360    = safeMount(app, 'Customer 360',         '/api/customer-360',    '../../routes/customer360Routes');
    results.ownerCommand = safeMount(app, 'Owner Command',          '/api/owner-command',
  '../../routes/ownerCommandRoutes');
    results.incidentCmd    = safeMount(app, 'Incident Command', '/api/incident-command',
  '../../routes/incidentCommandRoutes');
       results.physixplore      = safeMount(app, 'PhysiXplore',     '/api/physixplore',     '../../routes/physixploreRoutes');
       results.ecommerceHub     = safeMount(app, 'Ecommerce Hub',   '/api/ecommerce-hub',
  '../../routes/ecommerceHubRoutes');

       const mounted = Object.keys(results).filter(function (k) { return results[k]; });
       console.log('[registerAll] ' + mounted.length + '/' + Object.keys(results).length + ' new modules mounted.');
       return results;
  }

  module.exports = registerAll;
