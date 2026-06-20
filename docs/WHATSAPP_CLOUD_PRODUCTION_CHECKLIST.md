# WhatsApp Cloud — Production Checklist

Review this before flipping any live flag. The setup layer stays **dry-run** until an operator
deliberately enables live behaviour with explicit approval.

## Pre-production checklist

- [ ] Meta app created and in **Live** mode (not Development).
- [ ] WhatsApp Business Account (WABA) connected; `WHATSAPP_CLOUD_WABA_ID` set in `.env`.
- [ ] Phone number ID added; `WHATSAPP_CLOUD_PHONE_NUMBER_ID` set in `.env`.
- [ ] Business display name reviewed and approved by Meta.
- [ ] **Permanent** access token added to `WHATSAPP_CLOUD_ACCESS_TOKEN` in `.env` only.
- [ ] Webhook callback URL configured and reachable over HTTPS.
- [ ] `WHATSAPP_CLOUD_VERIFY_TOKEN` set and matches the Meta dashboard value.
- [ ] Webhook subscribed to the **messages** field.
- [ ] At least one **approved** template per category you intend to use.
- [ ] Test send preview reviewed (dry-run) and rendered correctly.
- [ ] Payment method added + business verification completed in Meta Business Manager.
- [ ] Messaging limits / quality rating understood.
- [ ] Production risk notes reviewed (opt-in compliance, 24-hour window, template categories).

## Safety flags (default values)

| Flag | Default | Meaning |
|---|---|---|
| `WHATSAPP_CLOUD_SETUP_ENABLED` | `true` | Coordination layer mounted |
| `WHATSAPP_CLOUD_SETUP_DRY_RUN` | `true` | All actions are previews |
| `WHATSAPP_CLOUD_LIVE_SEND` | `false` | Real sends disabled |
| `WHATSAPP_CLOUD_TEMPLATE_SYNC_LIVE` | `false` | No live Meta template sync |
| `WHATSAPP_CLOUD_REDACT_PII` | `true` | Mask phones/emails in output |
| `WHATSAPP_CLOUD_REDACT_SECRETS` | `true` | Hide tokens in output |

## What this layer will NEVER do

- Store or print a real access token.
- Expose a full phone number.
- Send a real WhatsApp message.
- Call the Meta Graph API on its own.
- Commit secrets, customer data, or runtime JSON.
