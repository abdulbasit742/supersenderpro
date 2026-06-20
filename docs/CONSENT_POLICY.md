# Consent Policy

## Principles
1. **Consent-first** — no outreach on a channel without recorded consent for that channel.
2. **Opt-out always honored** — a single opt-out disables every channel immediately.
3. **No unsolicited bulk messaging.**
4. **Quiet hours respected** — no messages during configured quiet hours (default 22:00–08:00 PKT).

## How decisions are made
`policyChecker.canContact(subjectId, channel)`:
1. If the subject opted out → **deny** (`opted_out`).
2. If consent-first is on and the channel has no consent → **deny** (`no_consent_for_<channel>`).
3. If currently within quiet hours → **deny** (`quiet_hours`).
4. Otherwise → **allow**.

## Recording consent
`POST /api/compliance/consent/:subjectId` with `{ "channels": { "whatsapp": true, "marketing": false } }`.
The voice channel is read live from the Voice AI consent store and cannot be overridden here, keeping
a single source of truth for voice.

## Integrating into outreach
Before any send, call `/api/compliance/check`. If `allowed:false`, do not send — log and respect the
reason. This module decides; your existing sender executes only on allow + after approval.
