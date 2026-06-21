  'use strict';

  /**
      * PhysiXplore Integration - optional live fetch (Phase 1).
      * OFF by default. When PHYSIXPLORE_LIVE_FETCH=true, fetches the public site
      * once and caches it. Timeout-guarded, no secrets, read-only. On any failure
      * it silently falls back to the built-in catalog snapshot.
      */

  const https = require('https');
  const catalog = require('./catalog');


  function liveFetchEnabled() {
       return String(process.env.PHYSIXPLORE_LIVE_FETCH || 'false').toLowerCase() === 'true';
  }
  function cacheTtlMs() {
    const m = parseInt(process.env.PHYSIXPLORE_CACHE_MINUTES, 10);
       return (Number.isFinite(m) && m > 0 ? m : 60) * 60 * 1000;
  }


  let cache = { at: 0, ok: false };

  function httpGet(url, timeoutMs) {
       return new Promise(function (resolve, reject) {
         const req = https.get(url, { timeout: timeoutMs || 8000 }, function (res) {
             let data = '';
             res.on('data', function (c) { data += c; if (data.length > 2e6) req.destroy(); });
             res.on('end', function () { resolve({ status: res.statusCode, body: data }); });
           });
           req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
           req.on('error', reject);
       });
  }

  // Very light HTML scan: pull "<n>Topic Studio" module rows if present.
  // This is best-effort; if parsing yields nothing, we keep the snapshot.
  function parseModules(html) {
       const out = [];
       const re = /(\d{1,2})\s*([A-Z][A-Za-z &]+?)\s+([A-Z][A-Za-z0-9 \-]+?)(?:\d{1,3}%)/g;
       let m;
       while ((m = re.exec(html)) !== null && out.length < 40) {
           out.push({
             id: parseInt(m[1], 10),
             topic: m[2].trim(),
             studio: m[3].trim(),
             slug: m[2].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
             videoUrl: null


        });
    }
    return out;
}

/**
* Refresh the catalog from the live site if enabled. Always resolves to a
   * status object; never throws. Falls back to snapshot on any problem.
   */
async function refresh() {
 if (!liveFetchEnabled()) {
        return { ok: true, source: 'snapshot', live: false, count: catalog.count() };
    }
    if (cache.ok && (Date.now() - cache.at) < cacheTtlMs()) {
      return { ok: true, source: 'cache', live: true, count: catalog.count() };
    }
    try {
        const res = await httpGet(catalog.SOURCE_URL + '/dashboard', 8000);
        if (res.status !== 200) throw new Error('status_' + res.status);
        const parsed = parseModules(res.body);
        if (parsed.length) catalog.replaceAll(parsed);
        cache = { at: Date.now(), ok: true };
        return { ok: true, source: 'live', live: true, count: catalog.count() };
    } catch (e) {
      // fall back silently to snapshot
        return { ok: true, source: 'snapshot-fallback', live: false, error: e && e.message, count: catalog.count() };
    }
}


module.exports = { refresh, liveFetchEnabled };
