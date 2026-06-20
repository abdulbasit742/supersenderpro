# Public Template Gallery

`public/templates.html` shows only **public_safe** and **demo_only** active templates via
`GET /api/template-marketplace/public-gallery`. It exposes a redacted subset only — no private/admin
templates, no internal install details, no secrets, no raw customer data.

Each card shows: industry, title, summary, modules included, setup time, and CTAs:
**Request Demo**, **Try Demo**, **Start Setup Preview**.
