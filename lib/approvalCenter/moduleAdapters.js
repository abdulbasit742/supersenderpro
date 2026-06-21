  'use strict';

  /**
      * Approval Center — read-only module adapters.
      *
      * Bridges to RBAC for role checks and Business Alerts for alert lookups, all
      * read-only. Never mutates. Degrades gracefully if a module is absent.
      */


  function tryRequire(p) { try { return require(p); } catch (_e) { return null; } }

  function rbac() { return tryRequire('../../src/modules/rbac') || tryRequire('../../src/modules/rbac/rbac'); }
  function adminAuth() { return tryRequire('../adminAuth'); }
  function businessAlerts() { return tryRequire('../businessAlerts/store'); }


  /** Can this actor act in the required role? Read-only RBAC check. */
  function actorMeetsRole(actorId, requiredRole) {
       const r = rbac();
       if (!r) return { available: false, allowed: true, note: 'rbac not detected; preview-permissive' };
       try {
         // owner clears everything; otherwise check a representative permission.
           const actor = (r.actorOf && r.actorOf(actorId)) || null;
           if (!actor) return { available: true, allowed: false, note: 'actor unknown to RBAC' };
           if (actor.role === 'owner') return { available: true, allowed: true, role: actor.role };
           const roleRank = { owner: 4, manager: 3, support: 2, viewer: 1 };
           const allowed = (roleRank[actor.role] || 0) >= (roleRank[requiredRole] || 0);
           return { available: true, allowed, role: actor.role };
       } catch (_e) { return { available: false, allowed: true }; }
  }


  function rbacAvailable() { return Boolean(rbac()); }
  function adminAuthAvailable() { return Boolean(adminAuth()); }

  function alertById(id) {
    const ba = businessAlerts();
       if (!ba || typeof ba.readAlerts !== 'function') return null;
       try { return ba.readAlerts().find((a) => a.id === id) || null; } catch (_e) { return null; }
  }

  module.exports = { actorMeetsRole, rbacAvailable, adminAuthAvailable, alertById };
