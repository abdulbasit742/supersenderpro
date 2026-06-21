# Reseller Commissions

Commission is PREVIEW ONLY. No real payouts, no payment API calls.

Preview shape: `{ resellerId, period, leads, convertedTenants, invoiceValue,
commissionRate, commissionAmountPreview, payoutStatus:'preview_only', source, warnings, dryRun }`.

Reads SaaS Billing reseller invoice data when available (`source: saas_billing`);
otherwise estimates from converted referrals (`source: referral_estimate`).
Tier default rates: referral 15%, agency 20%, reseller 25%, white-label 30%, enterprise 35%.
