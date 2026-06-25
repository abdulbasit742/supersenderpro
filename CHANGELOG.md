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