# SaaS Usage Metering

`lib/saasBilling/usageMeter.js` (+ `usageStore`, `usageRollups`, `quotaChecker`).

## Usage event
```
{ id, tenantId, feature, metric, amount, sourceModule, sourceId, dryRun, createdAt }
```
The store is capped at `SAAS_BILLING_MAX_USAGE_EVENTS` (default 5000); oldest events are trimmed.

## Tracked metrics
whatsapp_messages_sent/received, channel_posts, social_posts, ai_completions,
ai_tokens_estimated, voice_tts_characters, voice_stt_minutes, voice_generated_files,
flow_studio_runs, customer360_profiles, ecommerce_products_imported, orders_processed,
marketplace_entities, api_calls, team_member_seats, storage_estimate_mb.

## Rollups
`daily · weekly · monthly · billing_cycle` (calendar month by default).

## Privacy rules
- **No message bodies, no secrets, no full customer data** are stored — only counters + metadata.
- A missing `tenantId` is safely assigned to `"default"`.

## Recording from existing modules (opt-in)
```js
const { usageMeter, limitGuard } = require('../lib/saasBilling');
usageMeter.record({ tenantId, feature: 'channel_automation', metric: 'channel_posts', amount: 1, sourceModule: 'channelAutomation' });
// or check + record together (warn-only):
const { decision } = limitGuard.guard({ tenantId, feature: 'voice_ai', metric: 'voice_tts_characters', amount: 1200, sourceModule: 'voiceAI' });
```

## Quotas
`quotaChecker.checkTenant(tenantId)` maps usage to plan limits and returns `ok / warning (≥80%) /
exceeded` per limit — always `warnOnly: true`. The feature gate decides enforcement.

## API
- `GET /usage?period=monthly` · `GET /usage/:tenantId` · `POST /usage/record` (admin) · `POST /quota/check`
