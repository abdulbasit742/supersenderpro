# Growth Wiring + Compliance Consolidation — Next Prompt

```text
SuperSender Pro — Growth Wiring + Compliance
Consolidation (next prompt)

Wiring + consolidation pass (no new build). Reduces the duplicate-debt from the campaign/compliance overlap
and binds live actions to RBAC. Paste into the local coding agent on supersender-pro-final .

Rules
Relative paths only, no absolute/local paths. Do NOT rebuild any module. Append-only edits marked BEGIN/END
GROWTH WIRING HOOK . git status --short --branch first; no commit/push/rebase/reset/checkout. Everything stays
dry-run + approval-protected.

Scan first, then write docs/GROWTH_WIRING_REPORT.md + artifacts/growth_wiring_report.json .

Task 1 — Broadcast delegation (no new sender)
Wire lib/growthCampaign/campaignActions.schedule() to delegate actual broadcast to the EXISTING Campaign
Manager ( src/modules/campaigns ). Match its real sender signature. Stays dry-run unless
 GROWTH_CAMPAIGN_ALLOW_LIVE_POSTING=true AND the campaign is approved AND compliance passes. Never send
directly from the growth layer.

Task 2 — Single consent source
Two compliance surfaces exist: src/modules/compliance (opt-out/send-gate) and lib/complianceCenter
(consent/privacy). Make lib/complianceCenter the canonical consent authority; have src/modules/compliance
register as its send-time enforcement adapter. Do NOT delete either; add a thin bridge so complianceGuardAdapter
has ONE source of truth. Document the consolidation; don't migrate data.

Task 3 — Bind live-enable to RBAC
Every ALLOW_LIVE_* flag across growth campaign, agent deployment, and backup-restore must additionally
require an authenticated admin (existing RBAC) before any live action. Add a shared requireAdmin() guard check;
if RBAC is absent, default to blocked.

Validate (read-only)
   node --check lib/growthCampaign/campaignActions.js
   node --check lib/growthCampaign/complianceGuardAdapter.js
   npm run growth-campaign:check && npm run growth-campaign:smoke
   npm run compliance:center:check


Report back
delegation wired (yes/no), single consent source confirmed, RBAC gate added, anything still blocked, files to
avoid committing.
```
