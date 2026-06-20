# Approval, Audit & Security Integration

Integrates with Approval Inbox, Audit Ledger, Security Gateway, Compliance Center and Incident Command
**if available** — each adapter returns `available:false` safely when the module is missing.

- High-risk rollout changes create an **approval-item preview** (`approvalInboxAdapter`).
- Kill-switch actions create an **audit event preview** (`auditLedgerAdapter`) and an **incident warning
  preview** (`incidentCommandAdapter`).
- Security/compliance blockers prevent risky rollout in the evaluator.
- All records are redacted; no module is required to exist.
