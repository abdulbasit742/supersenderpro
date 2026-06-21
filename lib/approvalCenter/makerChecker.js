  'use strict';

  /**
   * Approval Center — maker-checker rule.
   *
   * Enforces separation of duties in PREVIEW: the approver must differ from the
   * maker, and must meet the required role (read-only RBAC check). Never executes
   * the underlying change.
   */

  const adapters = require('./moduleAdapters');
  const { maskActor } = require('./redactor');

  function check(input) {
    const i = input || {};
    const maker = String(i.maker || '');
    const checker = String(i.checker || '');
    const warnings = [];


       const blockers = [];

       if (!checker) blockers.push('no approver provided');
       if (maker && checker && maker === checker) blockers.push('maker and checker must differ (separation of duties)');

       const role = adapters.actorMeetsRole(checker, i.requiredRole || 'manager');
       if (role.available && !role.allowed) blockers.push(`approver lacks required role: ${i.requiredRole || 'manager'}`);
       if (!role.available) warnings.push('RBAC not detected; role check is preview-permissive');

       return {
         ok: blockers.length === 0,
           dryRun: true,
           makerSafe: maskActor(maker),
           checkerSafe: maskActor(checker),
           requiredRole: i.requiredRole || 'manager',
           approverRole: role.role || null,
           warnings, blockers,
       };
  }


  module.exports = { check };
