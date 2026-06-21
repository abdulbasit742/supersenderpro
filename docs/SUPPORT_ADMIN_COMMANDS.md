# Support Helpdesk — WhatsApp Admin Commands


Hooks for the EXISTING admin bot (no new bot). Concise Urdu/English.

| Command | Action |
| --- | --- |
| !supportstatus | counts summary |
| !tickets | list tickets |
| !ticket [id] | ticket detail (safe) |
| !urgenttickets | high/critical open |
| !supportreply [id] | reply draft |
| !resolveticket [id] | resolve (local) |
| !kbase [query] | KB search |
| !faq [query] | public-safe FAQ search |
| !supportdoctor | SLA risk summary |


Register `lib/supportHelpdesk/adminCommands.js` handlers in your existing router.
