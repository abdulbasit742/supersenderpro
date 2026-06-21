# SuperSender Pro Extracted Code - v13

Merged launch/support/funnel/inbox batch on top of v12.

- Files excluding `_duplicates`: 1170
- JS files: 787
- Validation: 787/787 JS files passed `node --check` in parallel validation.
- ZIP integrity test: passed.

## Added / updated modules
- Pilot Ops / Trial Operations: `lib/pilotOps` (30 files)
- Support Helpdesk + KB: `lib/supportHelpdesk` (21 files)
- White Label / Reseller Portal: `lib/resellerPortal` (35 files)
- Guided Demo Journey: `lib/guidedDemo` (9 files)
- Demo Sandbox + Product Tour: `lib/demoSandbox` (19 files)
- Public SaaS Funnel: `lib/publicSaasFunnel` (4 files)
- Shared Inbox 2.0: `lib/sharedInbox` (10 files)
- Omnichannel Inbox v1: `src/modules/inbox` (5 files)

## Safety / integration notes
- Root files were not directly overwritten. Use `patches/` hook snippets for server.js, package.json, env, and dashboard links.
- Live sends/payments/tenant writes/payouts/custom domains remain disabled by default.
- Source PDF text is saved in `source_text/`.
