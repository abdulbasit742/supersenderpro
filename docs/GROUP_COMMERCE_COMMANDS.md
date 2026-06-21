# Group Commerce OS — Admin Commands

All commands are admin-gated (hashed number check). Unverified senders get a
dry-run warning, never an action. Destructive actions need GROUP_COMMERCE_LIVE_GROUP_ACTIONS=true.

| Command | Effect |


| --- | --- |
| /help | list allowed commands |
| /status | show commerce/ai/relay/moderation modes |
| /pause 5m, /pause 10m | pause group AI replies (auto-resume) |
| /resume | resume immediately |
| /catalog | generate group catalogue post draft |
| /products, /stock | catalogue counts |
| /price SKU | latest price for a SKU |
| /sellers, /buyers, /orders | intelligence summaries |
| /rules | post group rules |
| /banlink on|off | moderation enforce(dry-run)/monitor |
| /approve @user, /warn @user, /remove @user | member actions (remove = dry-run unless live) |
| /appreciate @user | thank a trusted seller (draft) |
| /agent on|off, /agent assign sales|support | AI agent assignment (suggest-only) |
| /relay on|off | relay drafts (live only if GROUP_COMMERCE_LIVE_RELAY=true) |
| /ecom sync, /social sync | generate previews/drafts (no live writes/posts) |
