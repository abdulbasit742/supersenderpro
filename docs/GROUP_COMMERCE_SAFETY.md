# Group Commerce OS — Safety Model


## Dry-run by default
| Env | Default | Effect when false/true |
| --- | --- | --- |
| GROUP_COMMERCE_DRY_RUN | true | master switch; keep true until verified |
| GROUP_COMMERCE_LINK_MODERATION_DRY_RUN | true | link deletes are simulated |
| GROUP_COMMERCE_AI_AUTO_REPLY | false | agents only suggest; never auto-send |
| GROUP_COMMERCE_LIVE_GROUP_ACTIONS | false | /remove etc. simulated unless true |
| GROUP_COMMERCE_LIVE_RELAY | false | relay produces drafts unless true |
| GROUP_COMMERCE_ECOMMERCE_WRITE | false | ecommerce previews only unless true |


## Never do (by default)
- send real group messages
- delete real group messages
- remove real users
- post to social/channel
- write real ecommerce products/orders


## PII
- Phone numbers masked to last 4 before storage/display.
- Source message previews truncated + long digit runs masked.
- No secrets, tokens, or full emails are stored.

## Never commit
.env, .env.*, data/*.json, logs/, uploads/, sessions/, .wa-auth/, .baileys-auth/,
baileys_auth*/, node_modules/, token/credential/session files.
