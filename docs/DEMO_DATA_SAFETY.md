# Demo Data Safety

The Demo Sandbox is **fake-only, dry-run and non-destructive** by design.

## Fake data policy
- **Names** are clearly suffixed `(Demo)`.
- **Phones** are masked (`+92-3XX-XXXnnnn`) — never real numbers.
- **Emails** use the reserved, non-routable `@demo.invalid` domain.
- **Payment references** are masked (`DEMO-REF-****nnnn`) — never real refs.
- **No API keys, tokens, or secrets** ever appear in demo data.
- All records carry `demo:true` and (where relevant) `dryRun:true`.

## Blocked live actions (default-on)
The guard (`lib/demoSandbox/demoModeGuard.js`) blocks these while demo mode is enabled:
`send_whatsapp`, `send_message`, `post_channel`, `post_social`, `capture_payment`, `create_tenant`,
`charge_card`, `send_email`, `send_sms`, `external_api_call`, `mutate_real_data`, `delete_record`, `provision_account`.

`simulate(action)` returns a previewed, **blocked** result instead of performing anything.

## Immutable safety flags
`allowRealData` and `allowExternalCalls` are **forced to `false`** and cannot be loosened through the
`POST /config` API — only tightened. This prevents a demo session from ever touching live systems.

## Leak checks
Both `scripts/demo-sandbox-check.js` and `tests/smoke/demoSandboxSmoke.js` scan generated demo data for
long digit sequences (phones), real-domain emails, and `sk-` token patterns, and fail if any are found.
