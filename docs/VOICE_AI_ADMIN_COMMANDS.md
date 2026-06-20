# Voice AI Admin Commands

These hook into the **existing** admin command system (no new bot). Replies are Urdu/English mixed.
Handlers live in `lib/voiceAI/adminCommands.js` → `handle(command, args)`.

| Command | Description |
|---|---|
| `!voicestatus` | Show dry-run state, pending drafts, live-send state |
| `!voiceproviders` | List ready providers + default |
| `!voicequeue` | Show pending voice drafts |
| `!voiceapprove [id]` | Approve a draft (still dry-run) |
| `!voicereject [id]` | Reject a draft |
| `!voicepreview [text]` | Dry-run preview of text |
| `!voicetemplate [category]` | Show templates for a category |
| `!voicedigest` | Daily voice summary |
| `!voiceoptout [customer]` | Opt a customer out of voice |
| `!voiceconsent [customer]` | Show a customer's consent state |
| `!voiceagent on` / `off` | Toggle the voice agent |

Example reply:
> "Voice AI status: Dry-run ON hai. 3 drafts pending hain. Live sending disabled hai."

## Wiring into existing admin handler
In your existing admin message handler, call:
```js
const voiceAdmin = require('./lib/voiceAI/adminCommands');
const reply = voiceAdmin.handle(commandWord, args);
if (reply !== null) return sendReply(reply); // it was a voice command
```
