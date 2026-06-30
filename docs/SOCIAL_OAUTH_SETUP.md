# Social OAuth Setup — Facebook + Instagram (Meta)

This is everything you need to actually connect Facebook Pages and Instagram Business accounts and
publish to them. Facebook and Instagram both go through **Facebook Login** (one app, one flow).

> Code shipped in this branch: `lib/socialOAuth.js` (OAuth + tokens), `integrations/socialHub.js`
> (real Graph API posting), `routes/socialRoutes.js` (`/api/social/*` endpoints).

---

## 1. Create the Meta app

1. Go to <https://developers.facebook.com/apps> → **Create App** → type **Business**.
2. In the app, add these products:
   - **Facebook Login** (for the OAuth flow)
   - **Instagram Graph API** (for IG publishing)
3. Note your **App ID** and **App Secret** (App settings → Basic).

## 2. Configure Facebook Login

Facebook Login → Settings → **Valid OAuth Redirect URIs**, add exactly:

```
https://YOUR_DOMAIN/api/social/callback
```

For local dev you can also add `http://localhost:3000/api/social/callback`. The redirect URI must
match `FB_REDIRECT_URI` below **character-for-character**.

## 3. Environment variables

Add to your `.env`:

```bash
FB_APP_ID=your_app_id
FB_APP_SECRET=your_app_secret
FB_REDIRECT_URI=https://YOUR_DOMAIN/api/social/callback
FB_GRAPH_VERSION=v21.0            # optional, defaults to v21.0
SOCIAL_STATE_SECRET=some_long_random_string   # signs the OAuth state (CSRF)
SOCIAL_SUCCESS_REDIRECT=/connections.html?social=connected   # where to land after connect
```

## 4. Wire the route into the server

In the root `server.js`, mount the router with the other `/api` routes:

```js
app.use('/api/social', require('./routes/socialRoutes'));
```

> Note: there are two backends in this repo — the root `server.js` (JSON-file storage, what these
> routes use) and `backend/src/server.js` + the Supabase-backed `lovable-app`. This module targets
> the root server. If you standardise on Supabase later, store the same fields
> (`access_token`, `remote_id`, `token_expires_at`) in the `social_accounts` table instead of the
> JSON file — the OAuth logic in `lib/socialOAuth.js` stays the same.

## 5. The connect flow (what happens)

1. User clicks **Connect Facebook** → frontend calls `GET /api/social/connect/facebook` and opens
   the returned `url` (or hits it with `?redirect=1`).
2. User approves on Facebook → Facebook redirects to `/api/social/callback?code=...&state=...`.
3. Server verifies the signed `state`, exchanges the `code` for a **long-lived (~60 day) user
   token**, lists the user's **Pages** (each with its own Page token), and resolves any linked
   **Instagram Business** accounts.
4. Accounts are saved to `data/social_accounts.json` (tokens server-side only) and the user is
   redirected back to the app.

## 6. Publishing

```http
POST /api/social/publish
{ "accountId": "fb:1234567890", "message": "Hello world", "imageUrl": "https://..." }
```

- **Facebook:** text posts work; add `imageUrl` to post a photo, or `link` to attach a link.
- **Instagram:** `imageUrl` is **required** — the IG API does not allow text-only posts. Image must
  be a public URL.

## 7. Permissions & App Review (the part that takes time)

The app works in **Development mode** immediately for you and any users you add as testers
(App Roles → Testers). To post for the **public**, Meta requires **App Review** for these scopes:

- `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- `instagram_basic`, `instagram_content_publish`
- `business_management`

App Review typically takes **2–4 weeks** and needs a screencast + a privacy policy URL + a working
demo. **Plan for this early** — it's the real bottleneck, not the code.

## 8. Token lifetime

Page tokens derived from a long-lived user token are effectively long-lived, but the user token
expires in ~60 days. Before launch, add a refresh job (re-run the exchange) or prompt reconnect.
Tracked as a follow-up.

---

## Other platforms (LinkedIn, X, TikTok, YouTube)

Each needs its own app + OAuth + (usually) review. If you want “connect everything from one place”
fast, a social aggregator API (Ayrshare, Postiz, or self-hosted Mixpost) wraps all of them behind a
single key and avoids per-platform review. The `routes/socialRoutes.js` contract is generic enough
to add an aggregator as just another `platform` later.
