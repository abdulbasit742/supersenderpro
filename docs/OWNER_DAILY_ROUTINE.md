# Owner Daily Routine

A simple daily rhythm powered by the Owner Briefing autopilot.

## Morning (default 09:00, Asia/Karachi)
1. Open `/owner-briefing.html` → **Morning briefing**.
2. Review KPIs (voice conversations, pending approvals, open tasks, orders).
3. Clear **high** alerts first (negative sentiment, missing profile).
4. Action the top suggested items (each links to the right dashboard).

## Evening (default 20:00)
1. Open **Evening summary**.
2. Confirm pending approvals are cleared.
3. Note anything to follow up tomorrow.

## Automating it
The scheduler exposes advisory morning/evening times (`GET /api/owner-briefing/schedule`). Wire
these into your existing scheduler/cron to auto-generate briefings. Delivery stays dry-run until you
explicitly enable `OWNER_BRIEFING_ALLOW_LIVE_SEND=true` and route the approved packet through your
existing WhatsApp/email sender.

## Moving from dry-run to live delivery
1. Set `OWNER_BRIEFING_ALLOW_LIVE_SEND=true` and `OWNER_BRIEFING_DRY_RUN=false`.
2. Hand the approved delivery packet to your existing sender (this module never sends directly).
3. Keep redaction on so no customer PII leaks into owner messages.
