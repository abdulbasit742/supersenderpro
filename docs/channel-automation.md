# Channel Automation Command Center

A unified engine that forwards content between WhatsApp channels and social platforms
with safety checks, branding, approvals, dry-run mode and a health doctor.

- Engine: `lib/channelAutomationCenter.js`
- API routes: `routes/channelAutomation.js` (mounted at `/api/channels/*`)
- Dashboard: `public/channel-automation.html` → open at `/channel-automation`
- WhatsApp admin commands: handled inside `server.js` (Module 7)

> **Safety first.** The engine boots in **DRY-RUN** mode and live publishing stays off
> until you explicitly switch to LIVE. There is no spam / stealth / anti-ban logic —
> only admin-owned channels, opted-in targets and official platform APIs.

---

## Pipeline

```
source post → normalize → deduplicate → safety checks → branding → queue
            → (approval if required) → publish to target(s) → log result
```

Safety checks: media-type rule, max media size, keyword allow/block list,
competitor-mention blocker, blacklisted-sender filter, forwarding-depth limiter.

---

## API endpoints (`/api/channels/*`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/status` | – | Overview counters |
| GET | `/doctor` | – | Health checks |
| GET | `/logs?limit=` | – | Recent logs |
| GET/POST | `/sources` | write | List / add source |
| PUT/DELETE | `/sources/:id` | write | Update / delete source |
| GET/POST | `/targets` | write | List / add target |
| PUT/DELETE | `/targets/:id` | write | Update / delete target |
| GET | `/queue` | – | Queue items |
| POST | `/queue/:id/approve` | write | Approve (optional `{text, scheduleAt}`) |
| POST | `/queue/:id/reject` | write | Reject (optional `{reason}`) |
| POST | `/queue/:id/publish` | write | Publish now |
| POST | `/events/source-post` | write | Ingest a detected source post |
| POST | `/events/ecommerce` | write | Ecommerce event (`product_added`/`price_drop`/`low_stock`/`flash_sale`) |
| POST | `/test-publish` | write | Forced dry-run preview |
| GET/POST | `/digest[/generate]` | – / write | Daily digest text |
| POST | `/control` | write | `{action: pause|resume|dry-run|live}` |
| GET/PUT | `/settings` | – / write | Read / patch settings |
| POST/GET | `/export-config` | write | Export sources+targets+settings |
| POST | `/import-config` | write | Import a config bundle |
| GET | `/manual-packets` | – | WhatsApp fallback packets |
| POST | `/manual-packets/:id/done` | write | Mark packet posted |

**Auth:** write endpoints require header `x-admin-secret: <CHANNEL_ADMIN_SECRET>`
(falls back to `ADMIN_TOKEN`). If neither env var is set the server logs a warning
and allows the call in dev mode.

---

## WhatsApp admin commands (from admin number)

```
!channelstatus              status overview
!channelsources             list sources
!channeltargets             list targets
!channelqueue               show pending queue
!channelapprove [id]        approve queue item   (spec: approve post)
!channelreject [id]         reject queue item
!channelpublish [id]        publish queue item now
!pausechannels              pause all automation
!resumechannels             resume automation
!addsource [name] [chanId]  add a source channel
!addtarget [name] [chanId]  add a target channel
!route [sourceId] [tgtId]   map a source to a target
!digest                     daily digest
!channeldoctor              health check
```

> The existing `!approvepost` / `!sharepost` social commands are unchanged. Channel-queue
> approval uses `!channelapprove` to avoid colliding with the social-post approver.

---

## Setup guides

### WhatsApp channel
WhatsApp Channel **direct** publish is not guaranteed via API. The engine always creates a
**manual fallback packet** (`/api/channels/manual-packets`) the admin can post through the
existing channel publisher. No new auth needed.

### Telegram
1. Create a bot with @BotFather → copy token → `TELEGRAM_BOT_TOKEN`.
2. Add the bot as **admin** of your channel.
3. Set target `channelId` = `@yourchannel` or numeric chat id (or `TELEGRAM_CHANNEL_CHAT_ID`).

### Facebook / Instagram (Meta Graph API)
1. Meta app with `pages_manage_posts` (FB) and `instagram_content_publish` (IG).
2. `FB_PAGE_ACCESS_TOKEN` + `FACEBOOK_PAGE_ID`.
3. `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_IG_USER_ID` (Business account).
4. Instagram requires a **public https media URL**; images and Reels are validated before publish.

### LinkedIn
1. App with `w_member_social` (person) or org posting permission.
2. `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AUTHOR_URN`
   (`urn:li:person:xxxx` or `urn:li:organization:xxxx`).

### TikTok
Runs in **draft mode** by default. Set `TIKTOK_ACCESS_TOKEN` once the Content Posting API
publish scope is approved; until then the engine prepares a draft packet.

### Ecommerce
POST `/api/channels/events/ecommerce` from Shopify/WooCommerce/etc. webhooks (or the
ecommerce hub) with `{type, product:{name,price,oldPrice,url,image}, sourceId}`.

### Flow Studio triggers
Emit these events into the engine via `/events/source-post` or `/events/ecommerce`:
`whatsapp_channel_post`, `website_change`, `new_product`, `price_drop`, `stock_low`,
`social_message`. Honour the global dry-run/live setting.

---

## Safe launch checklist
- [ ] Set `CHANNEL_ADMIN_SECRET`.
- [ ] Add sources + targets and map routes.
- [ ] Run `Test Automation` (dry-run) and confirm queue/log entries appear.
- [ ] Approve a queued item and confirm publish path.
- [ ] Run `!channeldoctor` — resolve any missing-token warnings.
- [ ] Only then switch to **Live Mode**.
- [ ] Keep `requireApproval` on for sensitive channels.
