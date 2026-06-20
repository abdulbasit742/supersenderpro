# Guided Product Tours

A reusable tour engine (`public/js/demo-tour.js`) drives ten tours. It highlights an element when its
selector exists on the current page, and shows a centered **fallback card** when it does not — so a tour
never breaks an existing page.

| ID | Title |
|---|---|
| `full_product` | Full Product Tour |
| `business_owner` | Business Owner Tour |
| `whatsapp_automation` | WhatsApp Automation Tour |
| `channel_automation` | Channel Automation Tour |
| `customer_360` | Customer 360 Tour |
| `voice_ai` | Voice AI Tour |
| `growth_campaign` | Growth Campaign Tour |
| `saas_billing` | SaaS Billing Tour |
| `kpi_command` | KPI Command Tour |
| `public_funnel` | Public Funnel Tour |

### Tour step shape
```js
{ id, page, selector, title, description, actionHint, nextStepId, optional, moduleId }
```

### UI capabilities
start · next · previous · skip · finish · progress · highlight (if selector exists) · fallback card (if missing)

### Use on any page
```html
<link rel="stylesheet" href="/css/demo-tour.css" />
<script src="/js/demo-tour.js"></script>
<script>DemoTour.start('customer_360');</script>
```
