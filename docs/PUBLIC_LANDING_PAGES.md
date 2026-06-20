# Public Landing Pages

Static pages served from `public/` (also routed without `.html` via the server hook).

## Pages & sections

- **Landing (`/landing.html`)** — Hero (brand + value + CTAs: Request Demo, Start Setup Preview),
  pain points, core modules (loaded from `/api/public-funnel/config`), how-it-works, safety, final CTAs.
- **Features (`/features.html`)** — cards from `/api/public-funnel/features`; each shows what it does,
  who it helps, an example use case, a safety note and a CTA.
- **Use Cases (`/use-cases.html`)** — industry cards from `/api/public-funnel/use-cases`; CTA links to
  `/start.html?type=<preset>` to generate a setup preset preview.

## Styling

- Shared `public/css/funnel.css` (brand: teal/green + neutral, responsive, no external CDN).
- Per-page tweaks in `public/css/{landing,features,use-cases}.css`.
- The existing dashboard (`public/index.html`) is **not** rewritten — only small nav links were added
  inside the `<!-- BEGIN/END PUBLIC SAAS FUNNEL HOOK -->` markers.

## Safety

No secrets, tenant data, or runtime data are embedded in any public page. All dynamic data comes from
public, redacted API endpoints.
