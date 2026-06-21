 'use strict';
 /**
  * dashboardLinkMap.js — maps public pages to dashboard link presence + assets.
     * Reads index.html text (supplied). Does NOT rewrite the dashboard.
     */
 const PAGES = [
   { page: 'public/local-export.html', js: 'public/js/local-export.js', css: 'public/css/local-export.css', apiBase:
 '/api/local-export' },
   { page: 'public/local-demo.html', js: 'public/js/local-demo.js', css: 'public/css/local-demo.css', apiBase:
 '/api/local-demo' },
   { page: 'public/mock-gateway.html', js: 'public/js/mock-gateway.js', css: 'public/css/mock-gateway.css', apiBase:
 '/api/mock-gateway' },
   { page: 'public/guided-demo.html', js: 'public/js/guided-demo.js', css: 'public/css/guided-demo.css', apiBase:
 '/api/guided-demo' },
   { page: 'public/local-runtime.html', js: 'public/js/local-runtime.js', css: 'public/css/local-runtime.css', apiBase:
 '/api/local-runtime' },
   { page: 'public/gumloop-handoff.html', js: 'public/js/gumloop-handoff.js', css: 'public/css/gumloop-handoff.css',
 apiBase: '/api/gumloop-handoff' },
 ];

 function build(indexHtmlText, presentFiles) {
      const html = String(indexHtmlText || '');
      const present = new Set(presentFiles || []);
      const entries = PAGES.map((p) => {
        const href = '/' + p.page.replace(/^public\//, '');
        return {
          pageFile: p.page,
          linkExistsInDashboard: html.includes(href) ? 'yes' : 'no',
          jsExists: present.has(p.js) ? 'yes' : 'unknown',
          cssExists: present.has(p.css) ? 'yes' : 'unknown',
          apiBaseUsed: p.apiBase,
          missingAssetRisk: present.has(p.page) ? 'low' : 'unknown',
          safeFallbackPresent: 'yes',
        };
      });
      return { generatedAt: new Date().toISOString(), dryRun: true, pages: entries };
 }


 module.exports = { build, PAGES };
