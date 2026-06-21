   # Demo Sandbox + Guided Tour — Gap Report


   ## Scan summary
   Scanned for demo mode, seed data, sandbox mode, public funnel CTA, Business Setup,
   Customer 360, Owner Command, SaaS Billing, Tenant Portal, Voice AI, Channel

Automation, Marketplace Intelligence, Growth Campaigns, KPI Command, Compliance
Center, Incident Command, Playbook Builder, Flow Studio, dashboards, docs.

## Headline
A **Demo Mode** module already exists (`src/modules/demoMode.js`) that seeds fake
data and exposes `/demo-control` + `!demo` commands. That is the duplicate risk.
This Demo Sandbox layer does NOT rebuild it: the data factory reuses its
seed/status, and the new layer adds the missing **scenario launcher, guided tours,
live-action guard, demo dashboard, and module demo adapters**. The **Public SaaS
Funnel does not exist**, so the funnel CTA adapter reports unavailable.

## Classification
| Area | Status | Action |
| --- | --- | --- |
| Demo Mode (src/modules/demoMode) | exists, duplicate_risk | safe_to_extend (reuse seed/status) |
| Public SaaS Funnel | missing | funnel CTA adapter returns unavailable |
| Business Setup / Owner Command / KPI Command | exists | safe_to_extend (demo adapters) |
| Marketplace / Group Commerce / Growth Campaigns / Flow Studio / Compliance | exists | safe_to_extend |
| Voice AI / SaaS Billing / Tenant Portal | missing | fake demo data only |
| Channel Automation | partially_exists | safe_to_extend |
| ecommerce / payments / customers | exists, demo_data_risk | adapters never touch real storage |
| **Demo Sandbox + Guided Tour** | **missing -> created** | new coordination layer |


## Demo data + live-action risk
- All demo data is obviously fake: reserved `+1-555-0xxx` phones, `@example.test`
  emails, masked names, `DEMO-****` payment refs, every record `demo:true`.
- The demo guard blocks send_whatsapp, post_channel, post_social, capture_payment,
  create_tenant, external_api_call, write_business_module while demo mode is on.
- Adapters are read-only previews; real module storage is never mutated.


## Follow-ups
- needs_wiring: when Public SaaS Funnel is built, add the 3 demo CTAs as tiny links.
- recommend: consolidate /demo-control (existing) and /demo-sandbox so users have one entry.
