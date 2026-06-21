  # White Label + Reseller Partner Portal Command Center

  One portal for agencies/resellers: profiles, white-label branding previews, referral
  tracking, client/tenant previews, commission previews, partner asset library, and a
  public partner inquiry page. Rebuilds nothing. Reuses SaaS Billing, Tenant Portal,
  Pilot Ops, Support Helpdesk, Business Setup, KPI Command, Compliance via read-only
  adapters that degrade to `unavailable`.

  ## How to test
  ```bash
  npm run reseller-portal:check
  npm run reseller-portal:smoke
  node server.js && curl localhost:3001/api/reseller-portal/status


What not to commit
.env , data/reseller-*.json , artifacts/* . Only .env.example ships.
