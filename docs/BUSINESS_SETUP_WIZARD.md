 # Business Setup Wizard

 A coordination layer that makes SuperSender Pro easy to configure for any business.
 Pick a business type, apply an industry preset, get a setup checklist, and run a
 launch-readiness score. It rebuilds nothing: it reuses the existing WhatsApp Cloud
 Setup Wizard, integration wizard, Owner Command, launch center, security scan, and
 the module set as recommendations + checklist links.

 ## What it does
 - Business profile (type, country, language, currency, channels).
 - Industry preset launcher (16 business types -> presets).
 - Dynamic setup checklist with required/optional/blocker items.
 - Readiness doctor (0-100 score + band).
 - Export/import of setup profile (preview-only by default).

 ## How to use
 1. Open `/business-setup.html`.
 2. Fill the business profile, save.
 3. Open Preset launcher, apply a preset (dry-run). This creates recommendations +
    checklist, never enables modules.
 4. Work the checklist; mark items configured/verified.
 5. Run the readiness doctor until you reach pilot_ready / launch_ready.


 ## How to test
 ```bash
 npm run business-setup:check
 npm run business-setup:smoke
 node server.js && curl localhost:3001/api/business-setup/status


What not to commit
.env , data/business-*.json , artifacts/* . Only .env.example placeholders ship.
