 'use strict';
 /**
  * routeMountMap.js — maps route files to API base, mount status, dashboard page,
     * docs, package script. Reads server.js text (supplied) to detect mounts.
     * Does NOT modify mounts.
  */
 const KNOWN = [
   { routeFile: 'routes/localExportRoutes.js', apiBase: '/api/local-export', page: 'public/local-export.html', script:
 'local-export:check' },
   { routeFile: 'routes/localDemoRoutes.js', apiBase: '/api/local-demo', page: 'public/local-demo.html', script: 'local-demo:check' },
   { routeFile: 'routes/mockGatewayRoutes.js', apiBase: '/api/mock-gateway', page: 'public/mock-gateway.html', script:
 'mock-gateway:check' },
   { routeFile: 'routes/guidedDemoRoutes.js', apiBase: '/api/guided-demo', page: 'public/guided-demo.html', script:
 'guided-demo:check' },
   { routeFile: 'routes/localRuntimeRoutes.js', apiBase: '/api/local-runtime', page: 'public/local-runtime.html', script:
 'local-runtime:check' },
   { routeFile: 'routes/gumloopHandoffRoutes.js', apiBase: '/api/gumloop-handoff', page: 'public/gumloop-handoff.html',
 script: 'gumloop-handoff:check' },
 ];


 function build(serverJsText, presentRouteFiles) {
   const text = String(serverJsText || '');
      const present = new Set(presentRouteFiles || []);
      const entries = KNOWN.map((k) => {
        const mounted = text.includes(k.apiBase) || text.includes(k.routeFile.replace('routes/', './routes/'));
        return {
          routeFile: k.routeFile,
          apiBase: k.apiBase,
          mounted: mounted ? 'yes' : 'no',
          hookComment: text.includes('GUMLOOP HANDOFF HOOK') && k.apiBase === '/api/gumloop-handoff' ? 'BEGIN/END GUMLOOP HANDOFF HOOK' : null,
       relatedDashboardPage: k.page,
          relatedDocs: 'docs/GUMLOOP_IMPORT_PLAN.md',
          relatedPackageScript: k.script,
          safeStatusRoutePresent: k.apiBase + '/status',
          fileExists: present.has(k.routeFile) ? 'yes' : 'unknown',
        };
      });
      return { generatedAt: new Date().toISOString(), dryRun: true, routes: entries };
 }

 module.exports = { build, KNOWN };
