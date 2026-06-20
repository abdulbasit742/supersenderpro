# Developer Admin Commands

Wire `lib/developerPortal/adminCommands.js` into the existing admin command router.

Commands (replies are concise Urdu/English, no secrets/full URLs/keys):
- `!devapps` — list developer apps
- `!webhooks` — list webhook subscriptions (masked)
- `!events` — list available events
- `!webhooktest [id]` — queue a dry-run test
- `!devdoctor` — show safety flags
- `!apidocs` — where to find API docs
