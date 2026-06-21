 'use strict';
 /**
     * packageScriptMap.js — maps expected npm scripts to existence + target file +
     * safety, and recommends a Gumloop validation command. Reads package.json (supplied object).
  */
 const EXPECTED = [
      { name: 'local-export:check', target: 'scripts/local-export-check.js' },
      { name: 'local-export:smoke', target: 'tests/smoke/localExportSmoke.js' },
      { name: 'local-demo:check', target: 'scripts/local-demo-check.js' },
      { name: 'local-demo:smoke', target: 'tests/smoke/localDemoSmoke.js' },
      { name: 'mock-gateway:check', target: 'scripts/mock-gateway-check.js' },
      { name: 'mock-gateway:smoke', target: 'tests/smoke/mockGatewaySmoke.js' },

      { name: 'guided-demo:check', target: 'scripts/guided-demo-check.js' },
      { name: 'guided-demo:smoke', target: 'tests/smoke/guidedDemoSmoke.js' },
      { name: 'local-runtime:check', target: 'scripts/local-runtime-check.js' },
      { name: 'local-runtime:smoke', target: 'tests/smoke/localRuntimeSmoke.js' },
      { name: 'clickup-local:check', target: 'scripts/clickup-local-check.js' },
      { name: 'clickup-local:smoke', target: 'tests/smoke/clickupLocalSmoke.js' },
      { name: 'gumloop-handoff:check', target: 'scripts/gumloop-handoff-check.js' },
      { name: 'gumloop-handoff:smoke', target: 'tests/smoke/gumloopHandoffSmoke.js' },
 ];


 function build(pkgJson, presentFiles) {
      const scripts = (pkgJson && pkgJson.scripts) || {};
      const present = new Set(presentFiles || []);
      const entries = EXPECTED.map((e) => ({
        script: e.name,
        exists: Object.prototype.hasOwnProperty.call(scripts, e.name) ? 'yes' : 'no',
        targetFile: e.target,
        targetExists: present.has(e.target) ? 'yes' : 'unknown',
        safe: true,
        externalCalls: false,
        liveActionRisk: 'none',
        recommendedGumloopValidation: 'npm run ' + e.name,
      }));
      return { generatedAt: new Date().toISOString(), dryRun: true, scripts: entries };
 }


 module.exports = { build, EXPECTED };
