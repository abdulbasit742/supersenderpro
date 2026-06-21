  'use strict';


  /**
   * Approval Center — request CRUD + approve/reject PREVIEW.
      *
      * Approving/rejecting only changes the request's own status + audit. It NEVER
      * mutates the underlying module (no stock/payment/invoice/wallet/permission write).
      */

  const store = require('./store');
  const model = require('./approvalRequestModel');
  const policyEvaluator = require('./policyEvaluator');
  const risk = require('./riskClassifier');
  const makerChecker = require('./makerChecker');
  const audit = require('./approvalAuditPreview');
  const { redactDeep } = require('./redactor');


  function list(filter) {
       let items = store.readRequests();
       const f = filter || {};
       if (f.status) items = items.filter((x) => x.status === f.status);
       if (f.requestType) items = items.filter((x) => x.requestType === f.requestType);
       if (f.sourceModule) items = items.filter((x) => x.sourceModule === f.sourceModule);
       if (f.riskLevel) items = items.filter((x) => x.riskLevel === f.riskLevel);
       return items.slice(0, Number.isFinite(f.limit) ? f.limit : 100).map(redactDeep);
  }
  function getRaw(id) { return store.readRequests().find((x) => x.id === id) || null; }
  function get(id) { const x = getRaw(id); return x ? redactDeep(x) : null; }

  function create(input) {
       const i = input || {};
       const metrics = i.metrics || {};
       const policy = policyEvaluator.evaluate({ requestType: i.requestType, sourceModule: i.sourceModule, metrics });
       const riskLevel = risk.classify({ requestType: i.requestType, value: metrics.value, changePct: metrics.change_pct });
       const req = model.build({ ...i, riskLevel, requiredApprovals: policy.requiredApprovalsPreview });
       req.matchedPolicies = policy.matchedPoliciesPreview;
       req.requiredRole = policy.requiredRolePreview;
       const items = store.readRequests();
       items.unshift(req);
       if (items.length > 5000) items.length = 5000;


   store.writeRequests(items);
   audit.record('request_created_preview', { requestId: req.id, requestType: req.requestType, riskLevel });
   return redactDeep(req);
}


function update(id, patch) {
 const items = store.readRequests();
   const idx = items.findIndex((x) => x.id === id);
   if (idx === -1) return null;
   const r = items[idx]; const b = patch || {};
   if (b.title != null) r.title = String(b.title).slice(0, 120);
   if (b.reason != null) r.reason = String(b.reason).slice(0, 300);
   if (model.STATUSES.includes(b.status)) r.status = b.status;
   r.updatedAt = new Date().toISOString();
   items[idx] = r; store.writeRequests(items);
   return redactDeep(r);
}


function mutate(id, fn) { const items = store.readRequests(); const idx = items.findIndex((x) => x.id === id); if (idx
=== -1) return null; const u = fn(items[idx]); u.updatedAt = new Date().toISOString(); items[idx] = u;
store.writeRequests(items); return u; }


/** Approve preview: maker-checker enforced; status -> approved_preview when approvals met. */
function approvePreview(id, approver) {
 const r = getRaw(id);
   if (!r) return { ok: false, error: 'request not found' };
   const mc = makerChecker.check({ maker: r.requestedBySafe, checker: approver, requiredRole: r.requiredRole || 'manager'
});
 if (!mc.ok) { audit.record('approve_blocked_preview', { requestId: id, blockers: mc.blockers }); return { ok: false,
dryRun: true, liveMutation: false, requestId: id, blockers: mc.blockers, warnings: mc.warnings }; }
 const updated = mutate(id, (x) => { x.approvalsGiven = (x.approvalsGiven || 0) + 1; x.approverSafe = mc.checkerSafe;
x.status = x.approvalsGiven >= (x.requiredApprovals || 1) ? 'approved_preview' : 'pending_approval'; return x; });
 const auditPreview = audit.record('approve_preview', { requestId: id, status: updated.status, approver: mc.checkerSafe
});
 return { ok: true, dryRun: true, liveMutation: false, requestId: id, status: updated.status, approvalsGiven:
updated.approvalsGiven, requiredApprovals: updated.requiredApprovals, auditPreview, warnings: mc.warnings, blockers: []
};
}


function rejectPreview(id, approver, reason) {
 const r = getRaw(id);
   if (!r) return { ok: false, error: 'request not found' };
   const updated = mutate(id, (x) => { x.status = 'rejected_preview'; x.reason = reason ? String(reason).slice(0, 300) :
x.reason; return x; });
 const auditPreview = audit.record('reject_preview', { requestId: id, approver });
 return { ok: true, dryRun: true, liveMutation: false, requestId: id, status: updated.status, auditPreview, warnings:
[], blockers: [] };
}

function requestInfoPreview(id, note) {
 const updated = mutate(id, (x) => { if (!x) return x; x.status = 'needs_more_info'; x.reason = note ?
String(note).slice(0, 300) : x.reason; return x; });
 if (!updated) return { ok: false, error: 'request not found' };
   audit.record('request_info_preview', { requestId: id });
   return { ok: true, dryRun: true, requestId: id, status: 'needs_more_info', warnings: [], blockers: [] };
}


  module.exports = { list, get, getRaw, create, update, approvePreview, rejectPreview, requestInfoPreview };
