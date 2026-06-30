# SuperSender Pro — Social Media Production Completion Pack

This pack finishes the next practical layer for the Social Hub without committing any real credentials. It adds a repeatable readiness check so the project can clearly say what is ready, what is blocked by missing Meta/LinkedIn credentials, and what needs a public HTTPS media URL before production posting.

## What already exists

The current Social Hub already exposes the main dashboard workflow for:

- Facebook Page, Instagram Business, and LinkedIn account setup.
- OAuth helper URLs.
- Manual publish composer.
- Social auto-poster folder queue.
- AI video provider slots.
- Manual video jobs.
- Comments and replies.
- Recent posts and webhook events.

The API reference also lists the Social API group with account CRUD, app credentials, OAuth callback, publish, comments, events, posts, auto-poster jobs, scan, run, retry, and status endpoints.

## New production-readiness command

Run:

```bash
npm run social:check
```

JSON output for CI/Codex/Devin:

```bash
npm run social:check -- --json
```

Markdown output for a handoff report:

```bash
npm run social:check -- --markdown
```

Fail CI only when critical social checks are missing:

```bash
npm run social:check -- --fail-on-critical
```

## What the checker verifies

- `.env` or `.env.example` exists.
- Social platform env keys are declared.
- Social JSON data files are parseable.
- Social auto-poster and video auto-post folders exist.
- `SOCIAL_PUBLIC_BASE_URL` is a public HTTPS URL.
- Facebook, Instagram, and LinkedIn accounts have usable tokens and required IDs.
- Instagram media publishing has both a ready Instagram account and HTTPS media URL.
- AI video provider has API URL and key when video generation is required.
- Recent social jobs are not blocked, failed, or partial.

## Production setup order

1. Run `npm run health` to create missing data files and folders.
2. Create a Meta developer app and add the app ID/secret to `.env`.
3. Connect a Facebook Page and save the page access token/page ID from `/social`.
4. Connect Instagram Business to the same Page and save the IG user ID/token.
5. Create a LinkedIn app and save client ID/secret, access token, and author URN.
6. Set `SOCIAL_PUBLIC_BASE_URL` to the live HTTPS URL of the backend.
7. Run `npm run social:check` until critical failures are zero.
8. Test one Facebook text post, one Instagram image post, and one LinkedIn post from `/social`.
9. Drop a campaign file in `social-auto-posts/inbox` and run the auto-poster.
10. Add a video provider only after normal social posting is stable.

## Important production rules

- Never commit real `.env`, tokens, cookies, page tokens, app secrets, WhatsApp sessions, or runtime data files.
- Instagram cannot publish local/private media URLs. The image or video must be reachable over public HTTPS.
- Blocked social jobs are useful during setup because they prove the queue is safe and does not crash without credentials.
- Use official Meta/LinkedIn APIs and avoid spam/automation behavior that violates platform rules.
- Keep admin approval for high-volume campaigns.

## Recommended next coding pass

The next coding task should add an in-dashboard Social Readiness panel that calls a backend route such as `/api/social/readiness` and displays the same checks inside `frontend/app/social/page.js`. Because the current live backend still has most routes inside the large `server.js`, add that route carefully and do not duplicate the Social Hub system.


---

## Pass #2 additions (June 2026)

### Refactored readiness logic

The report-building logic has been moved to `lib/socialReadiness.js` and exported as:

```js
const { buildSocialReadinessReport } = require('./lib/socialReadiness');
const report = buildSocialReadinessReport({ rootDir: __dirname });
```

`scripts/socialMediaReadiness.js` now imports from the lib, keeping the same CLI modes.

### Backend endpoint

```
GET /api/social/readiness
```

Returns the same JSON shape as `npm run social:check -- --json`.
Tokens are always masked ? no raw secrets are ever returned.

Response shape:
```json
{
  "generatedAt": "...",
  "project": "SuperSender Pro",
  "module": "Social Media Automation",
  "readiness": "needs-work | staging-ready | production-ready",
  "score": 42,
  "totals": { "checks": 32, "passed": 14, "failed": 18, "criticalFailed": 8, "warningFailed": 6 },
  "summary": { "socialAccounts": 0, "configuredAccounts": 0, "publicBaseUrl": "" },
  "checks": [...],
  "nextSteps": [{ "name": "...", "level": "critical", "recommendation": "..." }]
}
```

### Dashboard readiness panel

The Social Hub page (`frontend/app/social/page.js`) now shows a **Social Production Readiness** panel at the top that:

- Fetches `GET /api/social/readiness` on load.
- Displays readiness badge, score, passed/failed counts, account summary, public URL.
- Lists top failed checks with recommendations.
- Has a **Refresh Readiness** button.
- Shows CLI hint: `npm run social:check` and `npm run social:smoke`.

### Smoke test

```bash
npm run social:smoke
```

Runs `tests/smoke/socialReadinessSmoke.js` which:
- Imports `buildSocialReadinessReport` from `lib/socialReadiness.js`.
- Runs it against repo root.
- Asserts required fields: `readiness`, `score`, `totals`, `checks` array.
- Asserts no unmasked raw tokens appear in JSON output.
- Exits non-zero on failure.

### Verification checklist

```bash
node --check lib/socialReadiness.js
node --check scripts/socialMediaReadiness.js
node --check tests/smoke/socialReadinessSmoke.js
npm run social:check
npm run social:smoke
```
