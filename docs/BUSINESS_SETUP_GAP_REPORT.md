 # Business Setup Wizard — Gap Report

 ## Scan summary
 Scanned for existing setup wizard, launch center, tenant onboarding, admin/AI/WhatsApp
 setup, ecommerce/payment/social/channel setup, Voice AI, Customer 360, Owner Command,
 Playbook Builder, Flow Studio, security scan, docs, env placeholders.

 ## Classification
 | Area | Status | Action |
 | --- | --- | --- |
 | WhatsApp Cloud Setup Wizard | exists | safe_to_extend (linked, not rebuilt) |
 | Integration setup wizard | exists | safe_to_extend (reused for connections) |
 | Owner Command Center | exists | safe_to_extend (digest + checklist) |
 | Launch center / security scan | exists | safe_to_extend (readiness factors) |
 | Customer 360 / CRM | partially_exists | needs_wiring |
 | Marketplace Intelligence / Group Commerce / Flow Studio / Agent Deployment | exists | safe_to_extend (recommendations)
 |
 | Channel Automation | partially_exists | safe_to_extend |
 | Voice AI | missing | needs_wiring (consent-gated checklist item) |
 | ecommerce / payments | exists | live_action_risk (never written from setup layer) |
 | admin auth / RBAC | unknown | needs_wiring (gate live enable) |
 | **Business Setup Wizard + Preset Launcher** | **missing -> created** | new coordination layer |

 ## Duplicate risk
 None. No existing setup/onboarding wizard of this kind; presets + checklist are new.
 The check script flags duplicate_risk if a second `businessSetup` route/page appears later.

 ## Live action risk
 None by default. Preset apply is dry-run; the safety guard hard-blocks WhatsApp send,
 social/channel post, ecommerce write, payment approval, and live voice from this layer.


 ## Setup blockers / needs
 - needs_wiring: Customer 360 + Voice AI module entry points.
 - needs_wiring: bind live enable to real admin RBAC before flipping ALLOW_LIVE_ENABLE.
 - needs_test: integration tests once modules are enabled in a sandbox.

PATCHES — server.js, index.html, .env.example,
