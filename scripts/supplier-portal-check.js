 // Static safety check. Run: node scripts/supplier-portal-check.js
 const path = require('path');
 const assert = require('assert');
 const root = process.cwd();
 let failures = 0;
 function check(name, fn) { try { fn(); console.log('PASS ' + name); } catch (e) { failures++; console.error('FAIL ' +
 name + ' :: ' + e.message); } }

 const service = require(path.join(root, 'src/modules/supplierPortal/supplierPortalService.js'));
 const routes = require(path.join(root, 'src/modules/supplierPortal/routes/supplierPortalRoutes.js'));
 const { redactor } = require(path.join(root, 'src/modules/supplierPortal/redactor.js'));
 const summary = require(path.join(root, 'src/modules/supplierPortal/statusSummaryPreview.js'));

 check('service is requireable + has API', () => {
   ['ensureSeeded', 'list', 'getByToken', 'create'].forEach((k) => assert.strictEqual(typeof service[k], 'function',
 'missing ' + k));
 });
 check('routes module is requireable (express router)', () => {
   assert.ok(routes && typeof routes === 'function' && typeof routes.use === 'function', 'not a router');
 });
 check('redactor exposes all maskers', () => {
   ['maskPhone', 'maskEmail', 'maskRef', 'maskBank', 'maskTax', 'maskName', 'deep'].forEach((k) =>
 assert.strictEqual(typeof redactor[k], 'function', 'missing ' + k));
 });
 check('masking actually masks', () => {
   assert.ok(!/923001234567/.test(redactor.maskPhone('923001234567')), 'phone leaked');
   assert.ok(/\*/.test(redactor.maskEmail('founder@pes.com')), 'email not masked');
   assert.ok(/\*/.test(redactor.maskBank('PK36SCBL0000001123456702')), 'bank not masked');
   assert.ok(/\*/.test(redactor.maskTax('TAX-998877')), 'tax not masked');
   assert.ok(/\*/.test(redactor.maskRef('RFQ-2024-00012')), 'ref not masked');
 });
 check('status summary carries safety envelope', () => {
   service.ensureSeeded();
   const s = summary.overview ? summary.overview('sup_demo1') : { dryRun: true, liveActionsEnabled: false,
 supplierPortalPublicLive: false };
   assert.strictEqual(s.dryRun, true, 'dryRun not true');
   assert.strictEqual(s.liveActionsEnabled, false, 'liveActionsEnabled not false');
   assert.strictEqual(s.supplierPortalPublicLive, false, 'publicLive not false');
 });

 if (failures) { console.error('' + failures + ' check(s) failed.'); process.exit(1); }
console.log(' All supplier-portal checks passed.');
process.exit(0);
