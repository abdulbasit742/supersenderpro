# Demo Data Safety


## Fake data policy
- Phone numbers use the reserved non-dialable `+1-555-0xxx` pattern.
- Emails use the `@example.test` reserved domain.
- Names are masked (`A*** (demo)`).
- Payment references are fake + masked (`DEMO-****1000`).
- Every record carries `demo:true`.


## Never
- Never uses real customer data (unless `DEMO_SANDBOX_ALLOW_REAL_DATA=true`, off).
- Never calls external APIs (`DEMO_SANDBOX_ALLOW_EXTERNAL_CALLS=false`).
- Never sends WhatsApp, posts social/channel, captures payment, or creates tenants.
- Never mutates real module storage (adapters are read-only previews).

The demo guard blocks all live actions while demo mode is on.
