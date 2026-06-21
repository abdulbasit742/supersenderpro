  // src/modules/tenant/store.js    (UPDATED: now delegates to the storage backend)
  // SuperSender Pro - per-tenant store helper, backend-pluggable.
  // Same API as before { read(), write(obj) } so adopting modules don't change.
  // Behind it: file backend (dev) or Postgres backend (prod), chosen by env.
  // Tenant id comes from the active AsyncLocalStorage context (tenant.run).

  'use strict';

  let _tenant = null;
  function tenantMod() {
    if (_tenant === null) { try { _tenant = require('./tenant'); } catch (_) { _tenant = false; } }
      return _tenant || null;
  }

  let _backend = null;
  function backend() {
    if (!_backend) { _backend = require('../../storage/backend').backend; }
      return _backend;
  }


  function currentTenantId() {
      const t = tenantMod();
      if (t && typeof t.currentTenantId === 'function') return t.currentTenantId();
      return process.env.TENANT_DEFAULT || 'default';
  }

  // Drop-in store. Sync API preserved (read/write) via the backend's *Sync methods
  // so existing synchronous modules work unchanged; async API also exposed for new code.
  function tenantStore(fileName, initial) {
      const init = initial !== undefined ? initial : {};
      return {
        read() { return backend().readDocSync(currentTenantId(), fileName, init); },
        write(obj) { return backend().writeDocSync(currentTenantId(), fileName, obj); },
        async readAsync() { return backend().readDoc(currentTenantId(), fileName, init); },
        async writeAsync(obj) { return backend().writeDoc(currentTenantId(), fileName, obj); },
        tenantId: () => currentTenantId(),
      };
  }

  module.exports = { tenantStore, currentTenantId };
