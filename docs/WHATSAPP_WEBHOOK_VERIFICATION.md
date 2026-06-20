# WhatsApp Webhook Verification

A **read-only helper** that explains and previews the Meta webhook verification handshake. It does
**not** replace or modify the existing live webhook route (`/api/whatsapp-cloud/webhook`).

## How Meta verifies your webhook

1. In **Meta App Dashboard → WhatsApp → Configuration**, set:
   - **Callback URL** → your public webhook URL (see helper output).
   - **Verify Token** → the **same** value you placed in `WHATSAPP_CLOUD_VERIFY_TOKEN` (`.env`).
2. Meta sends a `GET` request to your callback URL with:
   ```
   ?hub.mode=subscribe&hub.verify_token=<your token>&hub.challenge=<random>
   ```
3. Your server must respond with the `hub.challenge` value **only when** `hub.verify_token` matches
   the configured env value. Otherwise respond `403`.
4. Subscribe the webhook to the **messages** field to receive inbound messages and delivery statuses.

## Helper endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/whatsapp-cloud-setup/webhook-info` | Expected URL, verify-token env var name, flow steps |
| POST | `/api/whatsapp-cloud-setup/webhook-test-preview` | Dry-run handshake check |

The preview reports `wouldVerify: true/false/null` based on whether the supplied token matches the
configured env value. **The verify token value itself is never displayed.**

## Webhook URL

Built from `WHATSAPP_CLOUD_PUBLIC_BASE_URL` (or `SOCIAL_PUBLIC_BASE_URL`) + `WHATSAPP_CLOUD_WEBHOOK_PATH`
(default `/api/whatsapp/webhook`).

## Safety

No token is ever exposed. The helper performs no network call and cannot complete a real verification —
it only previews what the live route would do.
