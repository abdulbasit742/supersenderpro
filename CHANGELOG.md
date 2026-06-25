## [1.1.0] - 2026-06-25

### Added — Value Increase Sprint

#### 💳 Payment Gateway (Real Revenue Flow)
- lib/paymentGateway/index.js — Stripe (international) + Local PKR (JazzCash/EasyPaisa) checkout engine
- outes/paymentGatewayRoutes.js — /api/payment-gateway/status, /checkout, /webhook/:gateway
- public/payment-instructions.html — Beautiful PKR payment page with JazzCash/EasyPaisa numbers, 30-min countdown timer, reference code copy, WhatsApp confirm button
- public/payment-success.html — Post-payment confirmation page with next-steps guide
- Webhook verification support for Stripe (HMAC-SHA256) and PayFast (ITN)
- Sandbox mode ON by default (PAYMENT_SANDBOX=true) — safe to deploy immediately

#### 📊 Real Analytics Dashboard
- public/analytics.html — Live analytics with Chart.js revenue line chart + order status doughnut
- Real KPIs: total revenue, order count, customer count, WhatsApp messages
- Auto-refreshes every 60 seconds, reads from live API endpoints
- Recent orders table + top plans table

#### 🎨 White Label System
- lib/whiteLabelConfig/index.js — Brand name, colors, logo, domain, support contact, currency, timezone
- outes/whiteLabelRoutes.js — /api/white-label/brand (public), /config (admin GET/POST), /css
- public/white-label.html — Visual admin UI with live preview, color pickers, toggle switches
- CSS variable injection for dynamic theming across all pages
- Resellers can now deploy with their own brand in minutes

#### ⚙️ New .env Keys
- PAYMENT_GATEWAY, PAYMENT_SANDBOX, STRIPE_TEST_SECRET_KEY, STRIPE_LIVE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- WHITE_LABEL_BRAND_NAME, WHITE_LABEL_PRIMARY_COLOR, WHITE_LABEL_SUPPORT_WA, and 15+ more

# Changelog

All notable changes to SuperSender Pro are documented here.

## [1.2.0] - 2026-06-25
### Added
- Expanded Jest suite: 119 tests passing across 12 test files.
- Performance middleware with request/error/latency counters and slow-request warnings.
- Structured request logging with pino.
- /api/monitoring/performance endpoint for live app metrics.
- Production backup system: timestamped folder copy, masked .env snapshot, 7-backup retention.
- Restore, health-monitor, load-test, and SSL setup scripts.
- Complete API docs in docs/api/ (OpenAPI JSON + README + Deployment Guide).

## [1.1.0] - 2026-06-24
### Added
- Jest test suite (57 tests) for auth, payments, stock, dealers, monitoring, integration.
- /api/monitoring endpoints: health, metrics, info.
- Sentry error monitoring with graceful no-DSN fallback.
- Centralized error handler with Prisma P2002/P2025 code mapping.
- Rate limiting: auth 20/15min, payments 10/min, API 200/15min.
- Swagger/OpenAPI 3.0 documentation at /api-docs.
- 5-job CI/CD pipeline: validate, test, security-audit, docker-build, deploy-check.
- setup-production.js with automatic default-secret hardening.
- generate-secrets.js for cryptographic secret generation.

## [1.0.0] - 2026-06-23
### Added
- Initial production release.
- WhatsApp bot with Baileys + Meta Cloud API dual mode.
- Express/Prisma backend API with 19 route modules.
- Business portals: Customer, Staff, Dealer, Vendor, Franchise, Developer.
- JazzCash/EasyPaisa/Bank email payment parser.
- Google Sheets sync, n8n workflows, Docker/Kubernetes deployment.
- CRM, ecommerce hub, AI automation hub, social/video automation.