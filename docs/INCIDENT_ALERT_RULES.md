# Incident Alert Rules


Local alert rules describe when to raise an alert and which draft to produce. Outputs: dashboard_alert,
owner_command_digest_draft, whatsapp_admin_draft, markdown_report, json_report. Every rule is dry-run; nothing is sent
live by default.

## Condition syntax
`severity>=high` (operators >=, >, =, <=, <; levels info|low|medium|high|critical). Optional `moduleId` scoping. Cooldown
in minutes.

## Live alerts
Disabled by default (`INCIDENT_COMMAND_ALLOW_LIVE_ALERTS=false`). Even when enabled, sending must go through an existing
audited channel adapter, never from this layer directly.
