 # WhatsApp Cloud API — Production Readiness Checklist

 Use alongside the wizard at `/whatsapp-cloud-setup.html`. Nothing here sends messages or contacts Meta automatically.


 ## 1. Meta app & business
 - [ ] Meta Business account verified.
 - [ ] WhatsApp product added to the Meta app.
 - [ ] WABA created and linked to the app.
 - [ ] Display name approved for the sender number.
 - [ ] Phone number registered + verified in WhatsApp Manager.

 ## 2. Credentials (never commit)
 - [ ] `WHATSAPP_CLOUD_PHONE_NUMBER_ID` set (numeric ID).
 - [ ] `WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID` set (WABA ID).
 - [ ] Permanent system-user `WHATSAPP_CLOUD_ACCESS_TOKEN` set in env only.
 - [ ] Token scopes: `whatsapp_business_messaging`, `whatsapp_business_management`.
 - [ ] `WHATSAPP_CLOUD_API_VERSION` set (e.g. v20.0).

 ## 3. Webhook
 - [ ] Public HTTPS callback URL reachable (valid cert).
 - [ ] `WHATSAPP_CLOUD_VERIFY_TOKEN` set and matches Meta config.
 - [ ] GET verification returns hub.challenge with 200.
 - [ ] `WHATSAPP_CLOUD_WEBHOOK_SECRET` set; `X-Hub-Signature-256` validated on POST.
 - [ ] Subscribed fields: `messages`, `message_template_status_update`.
 - [ ] Test event received and acknowledged (200).


 ## 4. Templates
 - [ ] Required templates created in WhatsApp Manager.
 - [ ] Each template approved by Meta (status confirmed).
 - [ ] Language codes match what the app sends (e.g. en_US).
 - [ ] Param counts match the template body.
 - [ ] MARKETING templates only sent to opted-in recipients.

 ## 5. Safety & isolation
 - [ ] `WHATSAPP_CLOUD_DRY_RUN=true` until ready.
 - [ ] `WHATSAPP_CLOUD_LIVE_TEST=false` until a guarded live test is planned.
 - [ ] No tokens/secrets in committed files.
 - [ ] `data/whatsapp-cloud-setup-history.json` in `.gitignore`.
 - [ ] Baileys / local WhatsApp bot still functional (unchanged).
 - [ ] Existing Cloud API routes still functional (unchanged).


 ## 6. Go-live
 - [ ] Run `node scripts/whatsapp-cloud-check.js` — configured: yes.
 - [ ] Wizard "Setup Score" at 100%.
 - [ ] One guarded live test via your existing audited sender succeeds.
 - [ ] Flip `WHATSAPP_CLOUD_DRY_RUN=false` only after sign-off.
 - [ ] Monitoring/alerting on webhook + send failures in place.


HOOKS — server.js / public/index.html / package.json /
.env.example (append-only)

EXISTING-FILE HOOKS (append-only, clearly marked). Apply by hand after git status confirms none of these
files have staged changes you'd overwrite. No commit / push / reset / rebase / checkout.



1) server.js — route mount
Add near your other app.use('/api/...') mounts. Keep the markers.


  // BEGIN WHATSAPP CLOUD SETUP WIZARD HOOK
  try {
    const whatsappCloudSetupRoutes = require('./routes/whatsappCloudSetupRoutes');
    app.use('/api/whatsapp-cloud-setup', whatsappCloudSetupRoutes);
  } catch (e) {
      console.warn('[whatsapp-cloud-setup] routes not mounted:', e && e.message);
  }
  // END WHATSAPP CLOUD SETUP WIZARD HOOK




2) public/index.html — nav link
Add inside your existing nav/sidebar. Keep the markers.


  <!-- BEGIN WHATSAPP CLOUD SETUP WIZARD HOOK -->
  <a href="/whatsapp-cloud-setup.html" class="nav-link">WhatsApp Cloud Setup</a>
  <!-- END WHATSAPP CLOUD SETUP WIZARD HOOK -->




3) package.json — script (add only, remove nothing)
Add this single entry to the existing "scripts" object:


  "whatsapp-cloud:check": "node scripts/whatsapp-cloud-check.js"




4) .env.example — placeholders only (never real secrets)
Append this block. Add the bottom six only if not already present.


  # BEGIN WHATSAPP CLOUD SETUP WIZARD HOOK
  WHATSAPP_CLOUD_SETUP_ENABLED=true
  WHATSAPP_CLOUD_DRY_RUN=true
  WHATSAPP_CLOUD_LIVE_TEST=false
  WHATSAPP_CLOUD_API_VERSION=v20.0
  WHATSAPP_CLOUD_TEMPLATE_LANGUAGE=en_US

  WHATSAPP_CLOUD_SETUP_HISTORY_PATH=data/whatsapp-cloud-setup-history.json

  # Add only if not already present elsewhere in .env.example:
  WHATSAPP_CLOUD_API_ENABLED=false
  WHATSAPP_CLOUD_PHONE_NUMBER_ID=
  WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID=
  WHATSAPP_CLOUD_ACCESS_TOKEN=
  WHATSAPP_CLOUD_VERIFY_TOKEN=
  WHATSAPP_CLOUD_WEBHOOK_SECRET=
  # END WHATSAPP CLOUD SETUP WIZARD HOOK




5) .gitignore — recommended (append-only)
  # WhatsApp Cloud Setup Wizard local history (contains masked data only, still do not commit)
  data/whatsapp-cloud-setup-history.json




Validation (run locally, do not fake)
  node --check server.js
  node --check routes/whatsappCloudSetupRoutes.js
  node --check lib/whatsappCloudSetup/configInspector.js
  node --check lib/whatsappCloudSetup/templateRegistry.js
  node --check lib/whatsappCloudSetup/payloadBuilder.js
  node --check lib/whatsappCloudSetup/webhookDiagnostics.js
  node --check lib/whatsappCloudSetup/historyStore.js
  node --check scripts/whatsapp-cloud-check.js



Note: the wizard lib + routes are self-contained and depend only on express (already in your stack) plus Node
built-ins ( fs , path , crypto ). No new dependencies.
