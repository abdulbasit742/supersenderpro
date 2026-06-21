'use strict';
(function () {
  const BASE = '/api/local-worker';
  async function json(path, opts) { const r = await fetch(BASE + path, opts); return r.json(); }
  window.LocalWorkerBridge = { status: () => json('/status') };
  window.addEventListener('DOMContentLoaded', () => json('/status').then((s) => console.log('local worker bridge', s)).catch(console.warn));
}());
