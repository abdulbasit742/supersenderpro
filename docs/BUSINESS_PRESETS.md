# Business Presets

Each business type maps to a recommended setup path (`lib/unifiedSetup/presets.js`).

## Types
`ai_tools_reseller · ecommerce_store · education_admissions · real_estate · support_center ·
local_services · digital_products · marketplace_seller · agency · custom`

## Examples
**AI tools reseller:** business profile → admin auth → security scan → WhatsApp local → payments →
ecommerce → AI providers → voice AI (optional) → channel automation (optional) → owner command →
launch center → pilot launch.

**Ecommerce store:** ecommerce → payments → channel automation → social → Google Sheets / n8n →
Customer 360 → marketplace intelligence → launch.

**Education / admissions:** WhatsApp bot → Customer 360 → voice replies → Google Sheets → social →
playbooks → launch.

Each preset lists `recommended` (ordered) and `optional` step ids. The planner annotates every
recommended step with its live status so the owner always sees the next best action.
