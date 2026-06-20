# Team Access — Admin Commands

If an existing admin command system is present, wire these hooks via `lib/teamAccess/adminCommands.js`
(`handle(command, args, deps)`). Replies are concise Roman-Urdu/English. **No secrets, no full phone/email, no invite tokens.**

| Command | Description |
|---|---|
| `!teamaccess` | Team Access status summary |
| `!workspaces` | List workspaces (safe) |
| `!members [workspaceId]` | List members (masked) |
| `!roles` | List roles |
| `!seatusage [workspaceId]` | Seat usage preview |
| `!checkaccess [memberId] [permission]` | Check access (preview) |
| `!invitedraft [workspaceId]` | Create invite draft (no live send) |
| `!teamdoctor` | Run Team Access doctor |

If no admin command system is safely available, `lib/teamAccess/adminCommands.js` documents the integration point only; no duplicate bot is created.
