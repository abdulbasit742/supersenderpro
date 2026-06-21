  # Public Partner Page


  `public/partners.html`: hero, partner tiers, how-it-works, and an inquiry form.
  The form requires a consent checkbox and creates a SAFE lead preview only via

`POST /api/reseller-portal/public/partner-inquiry`. No live email/WhatsApp; the
public response is redacted. Links to the demo sandbox for self-serve demos.

When the Public SaaS Funnel exists, add a "Partners" link to it (tiny hook, no rewrite).

artifacts/reseller_portal_inventory.json +
docs/RESELLER_PORTAL_GAP_REPORT.md + PATCHES
