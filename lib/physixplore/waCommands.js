 'use strict';

 /**
     * PhysiXplore Integration - WhatsApp command handlers (Phase 1).
     * Returns reply TEXT only. NEVER sends. Your existing sender delivers the
     * reply (respecting compliance/opt-out). Wire these into your inbound handler.
     *
     * Commands:
     *   !sims | !physics        -> list modules (paged)
     *    !sim <number|name>     -> details + link for one module
     */


 const catalog = require('./catalog');
 const fetcher = require('./fetcher');

 function listReply(page) {
   const all = catalog.all();
      const perPage = 10;
      const p = Math.max(1, parseInt(page, 10) || 1);
      const start = (p - 1) * perPage;
      const slice = all.slice(start, start + perPage);
      if (!slice.length) return 'No modules found.';
      const lines = slice.map(function (m) { return m.id + '. ' + m.topic + ' (' + m.studio + ')'; });
      const totalPages = Math.ceil(all.length / perPage);
      let footer = '\n Reply *!sim <number>* for details (e.g. !sim 4).';
   if (totalPages > 1) footer += '\n\n              🔬\n Page ' + p + '/' + totalPages + ' - reply *!sims ' + (p + 1) + '* for more.';
   return '   *PhysiXplore - Physics Simulations*\n\n ' + lines.join('\n ') + footer;
 }

 function detailReply(arg) {
      let m = catalog.get(arg);
      if (!m) m = catalog.findByName(arg);
      if (!m) return 'Module not found. Reply *!sims* to see the list.';
      const link = catalog.linkFor(m);
   let out = '    🔬\n                 *' + m.topic + '*\n Studio: ' + m.studio + '\n Explore: ' + link;
   if (m.videoUrl) out += '\n 🎥 Video: ' + m.videoUrl;
      return out;
 }


/**
   * Handle an inbound text. Returns a reply string, or null if not a PhysiXplore
   * command (so your handler can pass it on to other modules).
*/
async function handle(text) {
    const t = String(text || '').trim();
    const lower = t.toLowerCase();

    if (lower === '!sims' || lower === '!physics' || lower.indexOf('!sims ') === 0) {
        await fetcher.refresh(); // no-op unless live fetch is enabled
        const page = lower.indexOf('!sims ') === 0 ? lower.split(/\s+/)[1] : 1;
        return listReply(page);
    }
    if (lower.indexOf('!sim ') === 0) {
      await fetcher.refresh();
        return detailReply(t.slice(5).trim());
    }
    return null;
}


module.exports = { handle, listReply, detailReply };
