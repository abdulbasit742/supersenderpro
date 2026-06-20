# Self-Serve Onboarding & Trial Requests

## Onboarding wizard (`/start.html`)

Steps: (1) business type → (2) primary goal → (3) modules → (4) plan interest → (5) contact details +
**consent checkbox** → (6) generated setup preview → submit trial/demo request.

The preview comes from `POST /api/public-funnel/onboarding/preview` and includes recommended modules,
playbooks, agents, a setup checklist and a recommended plan.

**Guarantees:** consent is required before submit; no live tenant is created; no messages are sent; no
internal config is exposed.

## Trial requests (`POST /api/public-funnel/trial-request`)

Creates a trial record (`review_needed`) plus:
- an **onboarding/setup preview**,
- a **tenant provisioning preview** (`tenantProvisionPreview`) — `realTenantCreated: false`,
- a **SaaS Billing trial-request draft** (`capturePayment:false`, `createSubscription:false`,
  `activateLicense:false`),
- an admin **review draft**.

Statuses: `requested, review_needed, approved_draft, tenant_preview_created, activated_manual,
rejected, archived`.

### Tenant write gating

A real tenant is **only** considered when `PUBLIC_FUNNEL_ALLOW_TENANT_WRITE=true` **and** global
`PUBLIC_FUNNEL_DRY_RUN` is OFF — and even then the funnel itself only produces a preview; promotion to a
live tenant happens via existing admin tenant tools after review. `safetyGuard` enforces this.

## Business Setup adapter

If the Unified Setup Wizard exists, presets, recommendations and credential checklists are read from it
(`adapters/businessSetupAdapter`). Otherwise safe fallbacks are used. Live setup is never modified.
