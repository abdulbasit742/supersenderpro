# Feature Flags Admin Commands

Wire these into your **existing** admin command system (do not create a new bot). Handlers live in
`lib/featureFlags/adminCommands.js`. Replies are concise Urdu/English; no secrets, no full tenant/customer PII.

| Command | Description |
|---|---|
| `!flags` | Summary of all flags |
| `!flag [key]` | Show one flag |
| `!flagcheck [key]` | Evaluate access (admin/business context) |
| `!rollout [key]` | Rollout preview |
| `!killswitch [key]` | Kill switch preview |
| `!featuredoctor` | Feature flags health summary |

Integration point: call `require('./lib/featureFlags/adminCommands').handle(cmd, arg)` from your command router.
