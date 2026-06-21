# Support Escalation & SLA

## SLA windows (by priority)
low 48h · medium 24h · high 8h · critical 2h.

## Escalation triggers
negative sentiment, billing/payment, WhatsApp disconnected, pilot blocked,
compliance, critical priority, or SLA overdue.

The SLA tracker returns `{ escalationRequired, reason, dueAt, overdue,
suggestedOwnerAction, dryRun }`. Escalations update local state only.
