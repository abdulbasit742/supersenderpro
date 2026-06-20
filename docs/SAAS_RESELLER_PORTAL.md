# SaaS Reseller / Agency Portal

`lib/saasBilling/resellerManager.js` (+ `resellerStore`, `commissionTracker`).
Adapts the existing `lib/resellerNetwork.js` (read-only) — it is **not** rebuilt.

## Reseller model
```
{ id, name, emailMasked, phoneMasked, status, assignedTenants, commissionRate, payoutStatus, createdAt }
```
Emails/phones are stored **masked only**.

## Capabilities
- Assign tenants to a reseller
- Track commission per invoice (draft, status `unpaid`)
- Track unpaid commission totals
- Export a privacy-safe commission report
- Reseller dashboard summary

> **No real payouts are processed.** Commission records are drafts for review.

## API
- `GET /resellers` · `POST /resellers` (admin) · `GET /resellers/:id`
- `POST /resellers/:id/assign-tenant` (admin) · `GET /resellers/:id/commissions`
