```md
# Support Ticket Workflow

1. Ticket created (source: WhatsApp, Customer 360, Pilot Ops, public funnel, manual…).
2. Auto-classify: category + sentiment, then priority scored.
3. Generate AI/rule-based reply draft + troubleshooting steps + related KB.
4. Escalate if rules trigger (negative sentiment, billing/payment, WhatsApp down,
   pilot blocked, compliance, critical, or SLA overdue).
5. Resolve / archive (local state only).

Statuses: new, open, waiting_customer, waiting_admin, escalated, resolved, archived.
Replies are drafts only; nothing is sent live unless explicitly enabled.
