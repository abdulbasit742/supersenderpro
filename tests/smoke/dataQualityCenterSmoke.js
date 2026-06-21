  'use strict';

  // Run locally: node tests/smoke/dataQualityCenterSmoke.js
  // Boots the router in-memory and hits each GET route, asserting ok:true shape.


 const express = require('express');
 const http = require('http');

 function request(server, path) {
   return new Promise((resolve, reject) => {
         const { port } = server.address();
         http.get({ host: '127.0.0.1', port, path }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
            catch (e) { resolve({ status: res.statusCode, json: null }); }
          });
       }).on('error', reject);
     });
 }

 async function main() {
   const router = require('../../routes/dataQualityCenterRoutes');
     const app = express();
     app.use('/api/data-quality-center', router);
     const server = app.listen(0);


     const paths = [
       '/status', '/issues', '/scan-preview', '/quality-score', '/summary', '/scans',
         '/products/check-preview', '/customers/check-preview', '/suppliers/check-preview',
         '/finance/check-preview', '/inventory/check-preview',
         '/duplicate-check-preview?entity=product', '/cleanup-recommendations-preview',
         '/merge-preview?entity=customer&ids=1,2',
     ];

     let failures = 0;
     for (const p of paths) {
         const r = await request(server, '/api/data-quality-center' + p);
         const ok = r.status === 200 && r.json && r.json.ok === true;
         console.log(ok ? 'PASS' : 'FAIL', p, r.status);
         if (!ok) failures += 1;
     }

     server.close();
     if (failures) { console.error(`[smoke] ${failures} route(s) failed`); process.exit(1); }
     console.log('[smoke] all routes ok');
 }


 main().catch((e) => { console.error('[smoke] error', e.message); process.exit(1); });
