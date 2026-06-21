 # WhatsApp Cloud API — Production Setup Wizard

 An **isolated** helper to configure, validate, and prepare the existing WhatsApp Cloud API lane for production. It is
 **dry-run first** and **secret-safe**. It does not send real messages by default, does not call Meta by default, and
 never stores or prints tokens.

 > It does NOT replace the existing Cloud API implementation, and it does NOT touch Baileys / the local WhatsApp bot / QR
 sessions / the local worker bridge.

 ## What it does
 - Inspects config presence/status (never values).
 - Validates phone number ID, WABA ID, API version format.
 - Confirms verify token + webhook secret presence.
 - Provides a local template registry.
 - Builds dry-run template-send payload previews (recipient masked).
 - Explains webhook verification + signature checks.
 - Keeps a safe, masked history (JSON file).

 ## Required environment variables
 | Var | Purpose | Secret |
 |---|---|---|
 | `WHATSAPP_CLOUD_API_ENABLED` | Turns the Cloud API lane on/off | no |
 | `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | Sender phone number ID (Meta) | no |
 | `WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID` | WABA / business account ID | no |
 | `WHATSAPP_CLOUD_ACCESS_TOKEN` | Permanent system-user token | YES — never commit |
 | `WHATSAPP_CLOUD_VERIFY_TOKEN` | Webhook GET verify token | YES |
 | `WHATSAPP_CLOUD_WEBHOOK_SECRET` | App secret for signature checks | YES |
 | `WHATSAPP_CLOUD_API_VERSION` | Graph API version (e.g. v20.0) | no |
 | `WHATSAPP_CLOUD_DRY_RUN` | Dry-run switch (default true) | no |
 | `WHATSAPP_CLOUD_LIVE_TEST` | Allow guarded live test (default false) | no |
 | `WHATSAPP_CLOUD_SETUP_ENABLED` | Enable the wizard routes (default true) | no |
 | `WHATSAPP_CLOUD_TEMPLATE_LANGUAGE` | Default template language (e.g. en_US) | no |
 | `WHATSAPP_CLOUD_SETUP_HISTORY_PATH` | History JSON path | no |

 ## Where to find the IDs
 - **Phone number ID**: Meta > WhatsApp > API Setup > "Phone number ID" (a numeric ID, NOT the phone number).
 - **WABA ID**: Meta Business Settings > Accounts > WhatsApp Accounts > your WABA.
 - **Access token**: create a System User in Business Settings, assign the WABA + app, generate a permanent token with
 `whatsapp_business_messaging` + `whatsapp_business_management`.

 ## Webhook verification (how it works)
 1. You configure a public HTTPS callback URL + a verify token in the Meta app.
 2. Meta sends `GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`.
 3. Your server returns `hub.challenge` (200) only if the verify token matches `WHATSAPP_CLOUD_VERIFY_TOKEN`.
 4. For `POST` events, validate `X-Hub-Signature-256` (HMAC-SHA256 of the raw body using `WHATSAPP_CLOUD_WEBHOOK_SECRET`)
 before processing.

  This wizard only **diagnoses** the above; it does not register webhooks.

  ## Template approval
  Templates in the local registry are `local-only` placeholders. WhatsApp **requires Meta approval** for template messages.
  This wizard never claims a template is approved. Submit templates in the WhatsApp Manager and only treat them as approved
  once Meta confirms.


  ## Dry-run vs live test
  - `WHATSAPP_CLOUD_DRY_RUN=true` (default): previews only.
  - `WHATSAPP_CLOUD_LIVE_TEST=false` (default): `/templates/test` is always dry-run.
  - `WHATSAPP_CLOUD_LIVE_TEST=true`: the route still refuses to invent a Meta call. Wire it to your existing audited Cloud
  API sender to actually send. Live responses never print tokens or full Meta payloads.

  ## Coexistence with Baileys
  This wizard touches only the Cloud API env + its own isolated files. The Baileys local bot, QR/session logic, channel
  automation, and worker bridge are untouched. You can run both lanes side by side.

  ## API routes
  - `GET /api/whatsapp-cloud-setup/status`
  - `GET   /api/whatsapp-cloud-setup/config`
  - `GET   /api/whatsapp-cloud-setup/templates`
  - `POST /api/whatsapp-cloud-setup/templates/preview`
  - `POST /api/whatsapp-cloud-setup/templates/test`
  - `GET   /api/whatsapp-cloud-setup/webhook-diagnostics`
  - `GET   /api/whatsapp-cloud-setup/history`
  - `DELETE /api/whatsapp-cloud-setup/history/:id`


  ## CLI

node scripts/whatsapp-cloud-check.js
  Prints a secret-safe summary. Exits 0 unless `WHATSAPP_CLOUD_CHECK_STRICT=true` and required config is missing.


  ## What NOT to commit
  - Real values for the access token, verify token, or webhook secret.
  - `data/whatsapp-cloud-setup-history.json` (add to `.gitignore`).

  ## Troubleshooting
  - **403 on verify**: verify token mismatch or `WHATSAPP_CLOUD_VERIFY_TOKEN` unset.
  - **Signature failures**: ensure you hash the RAW body, not the parsed JSON.
  - **Template send rejected**: template not approved, wrong language code, or param count mismatch.
  - **Wizard 404**: `WHATSAPP_CLOUD_SETUP_ENABLED=false`.
