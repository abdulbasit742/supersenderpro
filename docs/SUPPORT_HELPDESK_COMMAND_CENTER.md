  # Support Helpdesk + Knowledge Base Command Center

  One place to manage support tickets, a knowledge base, AI/rule-based reply drafts,
  SLA + escalation, and a public help page. It rebuilds nothing. It reuses Customer
  360, Pilot Ops (feedback), Owner Command, Incident Command, Compliance, Voice AI,
  and Business Setup via read-only adapters that degrade to `unavailable`.


  ## What it does
  - Ticket intake from many sources, auto-classify (category + sentiment), priority.
  - Knowledge base (15 seeded articles) with search + public-safe FAQ.
  - Reply drafts (rule-based; external AI only when explicitly enabled).
  - SLA windows + escalation rules.
  - Public help page with a consent-gated contact form (draft ticket only).

  ## How to test
  ```bash
  npm run support-helpdesk:check
  npm run support-helpdesk:smoke
  node server.js && curl localhost:3001/api/support-helpdesk/status


What not to commit
.env , data/support-*.json , artifacts/* . Only .env.example ships.
