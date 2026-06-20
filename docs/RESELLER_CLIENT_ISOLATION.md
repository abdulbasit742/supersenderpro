# Reseller / Client Isolation

The evaluator (`lib/tenantIsolation/isolationEvaluator.js`) blocks a reseller from accessing a client they are not assigned to.

```
decide({ actorType:'reseller', resellerId, assignedClientIds:[...], targetClientId }) 
  -> allowed:false, blockers:['client_not_assigned']  // when targetClientId not in assignedClientIds
```
- Assigned client → allowed (preview).
- Unassigned client → blocked.
- Report-only in dry-run; identifiers are hashed/redacted in responses.

Endpoint: `POST /api/tenant-isolation/check/reseller`.
