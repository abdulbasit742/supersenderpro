'use strict';
(function () {
  const BASE = '/api/approval-center';
  async function json(url) { const r = await fetch(url); return r.json(); }
  window.addEventListener('DOMContentLoaded', async () => {
    const el = document.querySelector('[data-status]') || document.body;
    try { const data = await json(BASE + '/status'); el.dataset.loaded = 'true'; console.log('public/js/approval-center.js loaded', data); } catch (e) { console.warn('public/js/approval-center.js status failed', e); }
  });
}());
