# Template Marketplace Command Center

A **coordination layer** that lets admins, resellers and business owners browse, preview, install-preview,
export and reuse business templates — without rebuilding any existing module.

> Additive only. It does NOT rebuild Business Setup Wizard, Flow Studio, Playbook Builder, Growth Campaign,
> Channel Automation, Voice AI, Public Funnel, Demo Sandbox, Reseller Portal, Support Helpdesk, SaaS Billing,
> Customer 360, Owner/KPI Command, or Compliance Center. It coordinates them through safe adapters.

## What it does
- **Template Marketplace** — 16 default industry blueprint packs + custom templates.
- **Automation Recipe Store** — 10 default dry-run recipes (draft-only actions).
- **Blueprint Installer** — generates install *previews/plans* only; live install gated off by default.
- **Admin dashboard** at `/template-marketplace.html` and **public gallery** at `/templates.html`.
- **Import/Export** of redacted template packs.

## Safety defaults
| Flag | Default |
|---|---|
| `TEMPLATE_MARKETPLACE_ENABLED` | true |
| `TEMPLATE_MARKETPLACE_DRY_RUN` | true |
| `TEMPLATE_MARKETPLACE_ALLOW_INSTALL` | false |
| `TEMPLATE_MARKETPLACE_ALLOW_LIVE_ACTIONS` | false |
| `TEMPLATE_MARKETPLACE_AI_LIVE` | false |
| `TEMPLATE_MARKETPLACE_REQUIRE_APPROVAL` | true |

Live install runs only when **both** `ALLOW_INSTALL` and `ALLOW_LIVE_ACTIONS` are `true`.

## Files
```
lib/templateMarketplace/        # store, guards, registry, catalog, validator, defaults,
                                # recipes, installer chain, draft generator, import/export, 14 adapters
routes/templateMarketplaceRoutes.js
public/template-marketplace.*   # admin dashboard
public/templates.*              # public gallery
scripts/template-marketplace-check.js
tests/smoke/templateMarketplaceSmoke.js
```

## Template model
`id, title, slug, category, industry, audience, description, tags, modulesUsed, includedRecipes,
includedPlaybooks, includedFlowNodes, includedCampaigns, includedSupportArticles, includedOwnerTasks,
recommendedPlan, difficulty, estimatedSetupTime, language, visibility, status, dryRun, createdAt, updatedAt`

Categories: industry_blueprint, automation_recipe, flow_template, campaign_template, support_template,
reseller_asset, public_funnel_template, demo_template, owner_command_template.
Visibility: admin_only, reseller_safe, public_safe, demo_only.

## How to test
```bash
npm run template-marketplace:check
npm run template-marketplace:smoke
```

## What NOT to commit
`.env`, `.env.*`, `data/*.json` runtime state, logs, uploads, auth/session folders, token/credential files,
raw customer/order/payment data, node_modules. (All already covered by `.gitignore`.)
