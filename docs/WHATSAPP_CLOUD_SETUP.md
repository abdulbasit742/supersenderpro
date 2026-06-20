# WhatsApp Cloud Setup

A guided, dry-run-safe onboarding layer for the **Official WhatsApp Cloud API**. It coordinates the
steps competitors (WATI, AiSensy, Interakt, Zoko, Gallabox, respond.io, Gupshup) ship as a setup
wizard — without touching SuperSender Pro's existing live `/api/whatsapp-cloud` send/webhook lane.

Open the dashboard at **`/whatsapp-cloud-setup.html`**.

## 1. Create a Meta app

1. Go to <https://developers.facebook.com/apps> → **Create App** → type **Business**.
2. Add the **WhatsApp** product to the app.

## 2. Connect a WhatsApp Business Account (WABA)

1. In **WhatsApp → API Setup**, select or create a WABA.
2. Copy the **WhatsApp Business Account ID** → put it in `WHATSAPP_CLOUD_WABA_ID` (`.env`).

## 3. Phone number ID

1. In **API Setup**, copy the **Phone number ID** (not the phone number itself).
2. Put it in `WHATSAPP_CLOUD_PHONE_NUMBER_ID` (`.env`).

## 4. Where the token goes

- Generate a **permanent (system user) access token**.
- Place it in `WHATSAPP_CLOUD_ACCESS_TOKEN` **in `.env` only**.
- **It is never stored in app data, never printed, and never committed.** The dashboard only shows
  whether a token is *configured*, never its value.

## 5. Readiness scoring

The wizard derives a readiness score and one of these statuses:
`blocked → local_ready → setup_ready → webhook_ready → template_ready → production_preview_ready`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/whatsapp-cloud-setup/status` | Flags + config + safety panel |
| GET | `/api/whatsapp-cloud-setup/checklist` | 14-step checklist |
| POST | `/api/whatsapp-cloud-setup/checklist/update` | Toggle a checklist item |
| GET | `/api/whatsapp-cloud-setup/readiness` | Score, status, blockers, next steps |
| POST | `/api/whatsapp-cloud-setup/validate-config` | Validate + save masked config |

## Safety

Dry-run by default. No live send. No live Meta API call. Tokens stay in `.env`. Phone numbers masked.
