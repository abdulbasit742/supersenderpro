# Reseller Portal — Safety Model


## Default posture
Dry-run on. Payouts, tenant writes, custom domains, white-label, live messages all OFF.


## Forbidden (always)
real_payout, live_tenant_create, configure_dns, issue_ssl, send_live_message, cold_outreach.


## Privacy + isolation
- PII masked (phone last-4, email, name).
- One reseller never sees another reseller's data.
- Client previews are business-name level only: no raw customer phone/email,
  payment refs, secrets, or raw chats/orders.

## Env flags (all off by default)
ALLOW_WHITE_LABEL, ALLOW_CUSTOM_DOMAIN, ALLOW_REAL_PAYOUTS, ALLOW_LIVE_MESSAGES.
