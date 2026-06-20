# Blueprint Installer / Install Preview

The installer builds an **install plan** and a **preview only** — it never mutates Business Setup, Flow Studio
or Playbooks by default, never creates live automations, never sends messages, and never creates real
tenants/billing.

## Install plan
`templateId, targetBusinessId, targetTenantId, modulesAvailable, modulesMissing, actionsPlanned, dryRun,
approvalRequired, blockers, warnings, nextSteps`

## Flow
1. `POST /blueprints/plan {templateId}` — build a plan against detected adapters.
2. `POST /blueprints/install-preview {templateId}` — preview affected modules/actions (no mutation).
3. `GET /install-history` — local preview/install events (redacted).

## Live install gating
Live install only runs when **both** `TEMPLATE_MARKETPLACE_ALLOW_INSTALL=true` and
`TEMPLATE_MARKETPLACE_ALLOW_LIVE_ACTIONS=true`. Otherwise `install()` returns `{ blocked:true }` with a
preview fallback. Missing modules are skipped safely via their adapters.
