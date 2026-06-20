# Pilot Launch Guide

## 1. Reach dry-run ready
- Complete the business profile.
- Verify required steps: admin auth, security scan, launch center.
- Most modules already run dry-run safe by default (Voice AI, Channel Automation, Marketplace Intel).

## 2. Move from dry-run to pilot
1. Add the credentials the checklist marks as required/optional for the channels you need.
2. Re-run `POST /api/unified-setup/scan` (local inspection).
3. Check `GET /api/unified-setup/readiness` — aim for `pilot_ready`.
4. Run `npm run launch:check` (existing launch center) for runtime checks.

## 3. Pilot checklist
- [ ] JWT_SECRET set
- [ ] Security scan clean (`npm run secret:scan`)
- [ ] At least one messaging channel connected (WhatsApp local or cloud)
- [ ] Payments / ecommerce connected if selling
- [ ] AI provider key added if using AI features
- [ ] Readiness status = pilot_ready, blockers = 0

## 4. Going to production
Production requires `production_ready_with_credentials`: score ≥ 85, no blockers, and all required
credentials set. Keep everything you can in dry-run until you have explicitly tested live actions.

## What not to commit
`.env`, real keys/tokens, `data/*.json`, logs, uploads, session/auth folders, private backups, node_modules.
