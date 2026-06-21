# Commission Preview QA

Commission QA reads the existing commissionPreview read-only and asserts: preview works, `payoutStatus ===
'preview_only'`, dry-run true, invoice/payment refs masked, manual review required. Payout safety check asserts
`RESELLER_PORTAL_ALLOW_REAL_PAYOUTS=false` and flags any payout-execution route. If SaaS Billing is unavailable, the
check degrades safely (no rebuild).


No real payouts, ever. No payment API calls.
