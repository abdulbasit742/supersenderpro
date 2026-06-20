# Public Pricing / Plan Comparison

`/pricing.html` renders plan cards from `GET /api/public-funnel/plans`.

## Plan source

- If **SaaS Billing** (`lib/subscriptionPlans.js`) is available, its plan registry is read and
  normalized into public-safe cards (`source: "saas_billing"`).
- Otherwise a safe fallback catalogue is used (`source: "fallback"`): Free Trial, Starter, Growth,
  Pro, Agency, Reseller, Enterprise, Lifetime, Custom.

Each card shows price/currency, billing cycle, best-for, feature highlights, limits summary, trial
availability and CTAs (**Request Plan**, **Talk to Sales**).

## Rules (enforced)

- **No real payment is captured.**
- **No subscription is created** by default.
- "Request Plan" routes to `/start.html?plan=<id>` and creates a **lead/request only**.
- Currency defaults to `PUBLIC_FUNNEL_DEFAULT_CURRENCY` (PKR).
