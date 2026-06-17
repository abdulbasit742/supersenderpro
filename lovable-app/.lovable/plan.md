## Goal
Aik composer jahan se aap text/image/video likhein, AI caption+hashtags generate karein, aur ek click pe FB, Instagram, LinkedIn, TikTok, WhatsApp aur Telegram pe publish ho jaye — saath hi schedule + queue.

## Scope (Phase 1 — is build mein)
1. **Lovable Cloud enable** — DB + Auth + Storage + Server functions
2. **User auth** — email/password + Google sign-in (har user apna account)
3. **Database schema**
   - `profiles` (user info)
   - `social_accounts` (per-user connected channels: platform, handle, encrypted tokens, expiry)
   - `posts` (content, media URLs, status: draft/scheduled/publishing/published/failed)
   - `post_targets` (post × platform × result, remote_post_id, error)
   - `media` (Storage references)
   - `user_roles` + `has_role()` (admin/user)
4. **Storage bucket** `post-media` (private, signed URLs) — image + video uploads
5. **Unified Composer UI** (`/composer`)
   - Text, media picker, platform toggles (sirf connected dikhayein)
   - **AI Generate** button → Lovable AI Gateway (caption + hashtags) — per platform tone
   - Per-platform preview cards
   - Send Now / Schedule (datetime) / Save Draft
6. **Publish pipeline** (TanStack server functions)
   - `publishPost` fan-out: har selected platform ke liye platform-specific server fn call
   - Token refresh + retry + error capture per target
7. **Schedule + queue**
   - `scheduled_at` column, cron-trigger server route at `/api/public/cron/dispatch` (Supabase pg_cron har minute hit karega) jo due posts publish karta hai
8. **Connections page** (`/connections`)
   - Har platform card → Connect/Disconnect, scope info, last sync
9. **Posts dashboard** (`/posts`)
   - Filters: status/platform, per-target results, retry failed

## Platform integration details
| Platform | Auth | Approach |
|---|---|---|
| Facebook Pages | Per-user OAuth (Meta) | Graph API `/{page}/feed`, `/{page}/photos`, `/{page}/videos` |
| Instagram Business | Per-user OAuth (Meta, via FB Page) | Graph API container → publish |
| LinkedIn | Per-user OAuth | `/v2/ugcPosts` (member or org) |
| TikTok | Per-user OAuth | Content Posting API video init + upload |
| WhatsApp | Cloud API (per-user phone number) | Graph `/messages` — note: marketing needs approved templates |
| Telegram | Per-user bot token OR channel | Bot API `sendMessage`/`sendPhoto`/`sendVideo` |

**OAuth secrets needed (workspace ke app credentials, har user ke nahi):**
- META_APP_ID, META_APP_SECRET (FB + IG share karte hain)
- LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
- TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
- WHATSAPP_APP_ID, WHATSAPP_APP_SECRET (Meta)
- TELEGRAM bot tokens — user khud BotFather se le ke paste karega

OAuth callback route: `/api/public/oauth/{platform}/callback` → token exchange → encrypt → store in `social_accounts`.

## Out of scope (Phase 2 — alag se baad mein)
- Analytics dashboard (views/likes pull-back)
- Comment/DM inbox unified
- Twitter/X, YouTube, Pinterest, Threads
- Approval workflows / team roles UI
- AI image generation in composer
- Bulk CSV import

## Important reality checks
- **Meta + TikTok app approval**: Production publishing scopes ke liye Meta/TikTok ko app review submit karna parta hai (1–4 hafte). Tab tak sirf aap (developer/test users) post kar sakte hain.
- **WhatsApp**: Sirf 24-hr customer service window mein free-form. Marketing ke liye pre-approved template chahiye.
- **Single magic link to "everything"**: aik composer click = all platforms — yeh ho jata hai. Lekin "single OAuth link" jo aik click mein sab platforms connect kar de — possible nahi, har provider ka apna OAuth flow chahiye. Hum ek `/connections` page denge jahan har platform ka apna "Connect" button hoga.

## Tech stack
- Frontend: TanStack Start (already setup), shadcn UI
- Backend: Lovable Cloud (Supabase) — server functions for publish, server routes for OAuth callbacks + cron
- AI: Lovable AI Gateway (`google/gemini-2.5-flash`) for captions

## Build order (mein step-by-step karunga)
1. Enable Cloud → schema + RLS + storage
2. Auth (email + Google)
3. Connections page + OAuth callback skeleton (FB/IG first)
4. Composer UI + AI caption
5. Publish fan-out (FB/IG → LinkedIn → TikTok → Telegram → WhatsApp)
6. Scheduler + cron
7. Posts dashboard

## Confirm karein
- Kya ye scope theek hai? Ya phase-1 mein sirf 2–3 platforms (e.g. FB+IG+LinkedIn) shuru karein taake jaldi chale aur baqi baad mein add karein?
- Meta/TikTok app aap khud Meta/TikTok developer portal pe create karenge (mein guide karunga), ya pehle se hai?
- WhatsApp: Cloud API (business) chahiye ya sirf personal-style (us case mein only via approved providers)?