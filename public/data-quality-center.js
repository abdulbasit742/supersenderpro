  (function () {
    'use strict';
    var BASE = '/api/data-quality-center';


    function get(path) {
        return fetch(BASE + path).then(function (r) { return r.json(); });
    }
    function show(id, data) {
      var el = document.getElementById(id);
        if (el) el.textContent = JSON.stringify(data, null, 2);
    }


    function loadSummary() {
        get('/summary').then(function (res) {
          if (!res.ok) return;
            var s = res.score || {};
            document.getElementById('scoreBox').textContent = (s.overall != null ? s.overall : '--') + ' (' + (s.grade || '?')
  + ')';
            show('summaryBox', { lastScan: res.lastScan, issueCount: res.issueCount, dryRun: res.dryRun });
            show('severityBox', res.bySeverity || {});
            show('entityBox', s.byEntity || {});
            var badge = document.getElementById('dryRunBadge');
            if (badge) badge.textContent = res.dryRun ? 'DRY-RUN' : 'LIVE?';
        });
    }


    var ACTIONS = {
        scan: function () { get('/scan-preview').then(function (r) { show('scanOut', r); loadSummary(); }); },
        products: function () { get('/products/check-preview').then(function (r) { show('productsOut', r); }); },
        customers: function () { get('/customers/check-preview').then(function (r) { show('customersOut', r); }); },
        suppliers: function () { get('/suppliers/check-preview').then(function (r) { show('suppliersOut', r); }); },
        finance: function () { get('/finance/check-preview').then(function (r) { show('financeOut', r); }); },
        inventory: function () { get('/inventory/check-preview').then(function (r) { show('inventoryOut', r); }); },
        dups: function () {
          var e = document.getElementById('dupEntity').value;
            get('/duplicate-check-preview?entity=' + encodeURIComponent(e)).then(function (r) { show('dupsOut', r); });
        },
        cleanup: function () { get('/cleanup-recommendations-preview').then(function (r) { show('cleanupOut', r); }); },
        merge: function () {
            var e = document.getElementById('mergeEntity').value || 'customer';
            var ids = document.getElementById('mergeIds').value || '';
        get('/merge-preview?entity=' + encodeURIComponent(e) + '&ids=' + encodeURIComponent(ids)).then(function (r) {
  show('mergeOut', r); });
        }
    };

    document.addEventListener('click', function (ev) {


   var act = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-act');
   if (act && ACTIONS[act]) ACTIONS[act]();
 });


 loadSummary();
})();
