# <Feature> - Subsystem Template

Copy this skeleton when adding a new subsystem so it matches the repo convention and is picked up by CI + the bootstrap automatically.

## Files to create
```
lib/<feature>/index.js
routes/<feature>Routes.js
tests/smoke/<feature>Smoke.js
docs/<FEATURE>.md
```

## lib/<feature>/index.js (skeleton)
```js
'use strict';
const repo = require('../db');
const COLLECTION = '<feature>';
async function create(tenantId, data) { repo.assertTenant(tenantId); return repo.create(tenantId, COLLECTION, data); }
async function list(tenantId, where = {}) { repo.assertTenant(tenantId); return repo.list(tenantId, COLLECTION, where); }
module.exports = { create, list };
```

## routes/<feature>Routes.js (skeleton)
```js
'use strict';
const express = require('express');
const F = require('../lib/<feature>');
const { sendError } = require('../lib/http/errors');
let requireAuth = (req,res,next)=>next();
try { requireAuth = require('../middleware/authMiddleware').requireAuth; } catch {}
const router = express.Router();
const tid = (req) => req.tenantId || 'default';
router.get('/', requireAuth, async (req,res)=>{ try { res.json({ success:true, items: await F.list(tid(req)) }); } catch(e){ sendError(res,e,req); } });
router.post('/', requireAuth, async (req,res)=>{ try { res.json({ success:true, item: await F.create(tid(req), req.body||{}) }); } catch(e){ sendError(res,e,req); } });
module.exports = router;
```

## Register it
Add to `lib/bootstrap/registerSubsystems.js` routers array:
```js
['<feature>', '/api/<feature>', '../../routes/<feature>Routes'],
```

## tests/smoke/<feature>Smoke.js (skeleton)
```js
'use strict';
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const F = require('../../lib/<feature>');
(async () => {
  const T = '<feature>_smoke_' + Date.now();
  const item = await F.create(T, { name: 'x' });
  assert.ok(item.id);
  const list = await F.list(T);
  assert.strictEqual(list.length, 1);
  // isolation
  const other = await F.list('other_' + T);
  assert.strictEqual(other.length, 0);
  console.log('OK');
})();
```

That's it - `scripts/ci-smoke.js` finds the smoke test, the bootstrap mounts the route, and `deploy-doctor` sees the wiring.
