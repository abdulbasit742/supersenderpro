  'use strict';

  /**
      * Master WhatsApp command router for the new modules.
      * Tries each module's command handler in order; returns the first reply text,
      * or null if none matched (so your existing handler continues). Defensive:
      * a missing module is just skipped.
      */

  function tryRequire(p) {
    try { return require(p); } catch (_e) { return null; }
  }

  const physixplore = tryRequire('../physixplore/waCommands');
  const ecommerceHub = tryRequire('../ecommerceHub/waCommands');

  /**
      * @param {string} text inbound message text
      * @returns {Promise<string|null>} reply text, or null if no module handled it
   */
  async function route(text) {
       // Ecommerce shop commands first (!shop, !product, !orders)
       if (ecommerceHub && typeof ecommerceHub.handle === 'function') {
           try { const r = await ecommerceHub.handle(text); if (r) return r; } catch (_e) {}
       }
       // Then PhysiXplore (!sims, !sim, !physics)
       if (physixplore && typeof physixplore.handle === 'function') {
           try { const r = await physixplore.handle(text); if (r) return r; } catch (_e) {}
       }
       return null;
  }

  module.exports = { route };
