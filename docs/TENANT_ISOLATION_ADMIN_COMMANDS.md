# Tenant Isolation Admin Commands

`lib/tenantIsolation/adminCommands.js` exposes safe handlers (concise Urdu/English mixed). Wire into the existing admin command system — no duplicate bot.

| Command | Description |
|---|---|
| `!isolation` | Status, policy count, score |
| `!tenantcheck` | Cross-tenant boundary test |
| `!leakscan` | Leak scan status (redacted) |
| `!routescan` | Route boundary scan summary |
| `!storescan` | Source field scan summary |
| `!isolationdoctor` | Doctor score + next step |

Replies never contain secrets, full phone/email, or raw tenant data.
