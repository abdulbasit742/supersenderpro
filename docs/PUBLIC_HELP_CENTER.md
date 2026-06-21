  # Public Help Center


  `public/help.html` shows public-safe FAQ + a contact form. The form:
  - requires a consent checkbox,
  - creates a LOCAL ticket preview only (`source: public_funnel`),
  - never sends live email/WhatsApp,
  - never exposes private admin data.


  Enable/disable via `SUPPORT_HELPDESK_PUBLIC_HELP_ENABLED`. When the Public SaaS
  Funnel exists, add a "Help Center" link to it (tiny hook, no rewrite).


artifacts/support_helpdesk_inventory.json +
