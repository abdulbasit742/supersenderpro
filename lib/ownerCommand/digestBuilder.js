  'use strict';

  /**
      * Owner Command - daily digest builder (Phase 1, read-only).
      * Rolls up safe, masked summaries from existing modules into a draft digest.
      * Missing modules degrade to { available:false }. Nothing is sent.
      */

  const path = require('path');

  function safeRequire(rels) {
       for (var i = 0; i < rels.length; i++) {
         try { return require(rels[i]); } catch (_e) {}
       }
       return null;
  }
  function abs(p) { return path.resolve(process.cwd(), p); }

  function revenueSummary() {
       const m = safeRequire([abs('src/modules/revenue/revenue'), abs('lib/kpiCommand/index')]);
       if (!m) return { available: false };
       try {
         if (typeof m.summary === 'function') return Object.assign({ available: true }, m.summary());
         return { available: false };
       } catch (_e) { return { available: false }; }
  }


  function leadsSummary() {
    const m = safeRequire([abs('lib/publicSaasFunnel/leadStore')]);
       if (!m || typeof m.stats !== 'function') return { available: false };
       try { return Object.assign({ available: true }, m.stats()); }
       catch (_e) { return { available: false }; }
  }

  function riskSummary() {
       const m = safeRequire([abs('src/modules/banRisk/banRisk'), abs('src/modules/churnRisk/churnRisk')]);
       if (!m || typeof m.summary !== 'function') return { available: false };
       try { return Object.assign({ available: true }, m.summary()); }
       catch (_e) { return { available: false }; }
  }


  /**
   * Build a draft digest. DRAFT only: never sent. Returns text + structured data.
   */
  function build() {
       const rev = revenueSummary();
       const leads = leadsSummary();


    const risk = riskSummary();

    const lines = [];
    lines.push('SuperSender Pro - Daily Owner Digest (' + new Date().toISOString().slice(0, 10) + ')');
    lines.push('');
 lines.push('Revenue: ' + (rev.available ? JSON.stringify({ mrr: rev.mrr, activeSubs: rev.activeSubs }) :
'unavailable'));
    lines.push('Leads: ' + (leads.available ? (leads.total + ' total') : 'unavailable'));
    lines.push('Risk: ' + (risk.available ? JSON.stringify(risk) : 'unavailable'));
    lines.push('');
    lines.push('(Draft. Nothing was sent. Wire a sender + approval to deliver.)');

    return {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      sent: false,
      sections: { revenue: rev, leads: leads, risk: risk },
      text: lines.join('\n')
    };
}

module.exports = { build, revenueSummary, leadsSummary, riskSummary };
