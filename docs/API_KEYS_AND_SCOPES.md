# API Keys & Scopes

- `POST /api/developer-portal/apps/:id/api-key-preview` issues a **one-time** key.
- Keys are **DEMO** (`sk_demo_...`) unless `DEVELOPER_PORTAL_ALLOW_REAL_KEYS=true`.
- Only a masked preview + SHA-256 hash are persisted. The raw key is shown once and never stored.

## Scopes
`read:public_funnel, read:customers_preview, read:support, write:support_draft, read:pilot_ops,
read:reseller, read:templates, write:template_preview, read:approvals, write:approval_preview,
read:audit, read:kpi, read:deployment, read:compliance, admin:preview`

## Rate limits
Local policy only (tiers: free/starter/pro/partner). No insecure auth bypass.
