# Public Funnel — Admin WhatsApp Commands

`lib/publicSaasFunnel/adminCommands.js` exposes a `handle(text)` function returning concise
Urdu/English-mixed replies. It is an **integration point only** — it does **not** start a new bot.
Wire `handle()` into the existing admin command router; do not create a duplicate bot.

## Commands

| Command | Result |
|---|---|
| `!leads` | total / qualified / hot lead counts |
| `!hotleads` | top hot/priority leads (masked names) |
| `!demos` | demo request counts by status |
| `!trials` | trial request counts by status |
| `!lead [id]` | one lead summary (masked) |
| `!followupdraft [leadId]` | follow-up **draft** (blocked if no consent) |
| `!funnelstatus` | enabled / dryRun / consent posture |
| `!funnelkpi` | leads / demos / trials / conversion % |
| `!pricinglink` | public pricing URL |
| `!startlink` | public start-setup URL |

## Safety

- Replies are read-only or produce drafts; **nothing is sent**.
- Masked data only; no raw PII.
- If no safe admin command system is available, use `adminCommands.handle()` directly and document the
  integration point — do not spin up a separate bot.

## Flow Studio

`lib/publicSaasFunnel/flowNodes.js` registers triggers (`public_funnel.lead_created`,
`demo_requested`, `trial_requested`, `hot_lead_detected`, `setup_preview_created`, `followup_needed`,
`reseller_inquiry_created`) and actions (create drafts, previews, recommendations, notify admin,
add-to-growth-campaign draft). All actions are `live: false`.
