'use strict';
(function () {
  const BASE = '/api/receivables-center';
  async function json(url) { const r = await fetch(url); return r.json(); }
  window.addEventListener('DOMContentLoaded', async () => {
    const el = document.querySelector('[data-status]') || document.body;
    try { const data = await json(BASE + '/status'); el.dataset.loaded = 'true'; console.log('public/js/receivables-center.js loaded', data); } catch (e) { console.warn('public/js/receivables-center.js status failed', e); }
  });
}());
