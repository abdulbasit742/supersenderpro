  # Demo Sandbox + Guided Product Tour Command Center

  A safe demo mode so clients, leads, resellers, and investors can experience
  SuperSender Pro without connecting real accounts or exposing private data.
  It rebuilds nothing. It REUSES the existing Demo Mode module
  (`src/modules/demoMode.js`) for data seeding and adds the missing pieces:
  scenario launcher, guided tours, a live-action guard, a demo dashboard, and
  module demo adapters.

  ## What it provides
  Fake business profiles, customers, orders, payments, WhatsApp chats/channel
  drafts, social posts, ecommerce products, Voice AI transcripts, AI agent
  suggestions, SaaS tenants/plans, KPI analytics, guided tour steps, demo reset,
  scenario launcher, and public-funnel demo CTAs.

  ## How to test
  ```bash
  npm run demo-sandbox:check
  npm run demo-sandbox:smoke
  node server.js && curl localhost:3001/api/demo-sandbox/status


What not to commit
.env , data/demo-sandbox*.json , artifacts/* . Only .env.example ships.
