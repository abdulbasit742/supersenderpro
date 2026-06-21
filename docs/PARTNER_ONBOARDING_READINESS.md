 # Partner Onboarding Readiness

 The onboarding checklist probes the existing portal modules + env and reports 15 items across profile, tier, masked
 contact, referral code, public page, demo + funnel links, white-label, commission, assets, support process, tenant
 privacy, consent, payout disabled, live messages disabled.

 ## Item statuses
 missing, configured, warning, blocked, skipped, verified. Required items drive the required-percent. `payout_disabled`
 and `live_messages_disabled` are required and become blockers if those flags are on.

 ## Score

Readiness score = configured-or-verified / total. The onboarding doctor returns score, blockers, warnings, and next
steps.
