 # Business Setup Readiness


 The readiness doctor scores setup 0-100 across weighted factors and assigns a band.


 ## Bands
 | Score | Band | Meaning |
 | --- | --- | --- |
 | 0-30 | blocked | critical setup missing |
 | 31-60 | setup_incomplete | keep going |
 | 61-80 | dry_run_ready | safe to test in dry-run |
 | 81-95 | pilot_ready | ready for a controlled pilot |
 | 96-100 | launch_ready | ready to go live |

 ## Factors (weighted)
 WhatsApp connected, admin auth/numbers, AI provider or mock fallback, payment method,
 ecommerce (if needed), channel/social (if needed), Voice AI consent guard (if enabled),
 Customer 360 privacy, Owner Command digest, security scan clean, required docs present,
 dry-run checks passing.


 Blockers are required checklist items flagged as launch blockers that are not yet
 verified/configured. They must be cleared to reach launch_ready.
