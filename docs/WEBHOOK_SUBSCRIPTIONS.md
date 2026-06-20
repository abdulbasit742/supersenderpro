# Webhook Subscriptions

`POST /api/developer-portal/webhooks` creates a subscription.

Stored fields: `id, appId, urlMasked, eventTypes, status, signingSecretPreview, signingSecretHash,
deliveryMode, dryRun, createdAt, updatedAt`.

Delivery modes: `disabled | dry_run | manual_test_only | live_disabled_by_policy`.

- The full webhook URL is **never** returned by the API (kept only in the gitignored local store).
- The signing secret is **never** exposed (only a masked preview + hash).
- Default `deliveryMode = dry_run`.
