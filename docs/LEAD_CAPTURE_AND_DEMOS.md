# Lead Capture & Demo Requests

## Lead capture (`POST /api/public-funnel/leads`)

1. Input is validated (`leadNormalizer.validate`) — requires a contact (email or phone) + business type.
2. PII is masked immediately (`leadNormalizer.normalize` + `privacyGuard`). **Raw email/phone/name are
   never persisted.**
3. The lead is scored (`leadScoring`) → `{ score, grade (cold|warm|hot|priority), reasons, nextAction }`.
4. A defensive leak scan blocks any record that still contains raw PII.
5. Lead statuses: `new, qualified, demo_requested, trial_requested, contacted, waiting_reply,
   converted, rejected, archived`.

**Public responses are heavily redacted** (`publicLeadView`). Masked contact (`adminLeadView`) is only
returned when a valid admin secret is supplied. Full PII is never returned.

## Demo requests (`POST /api/public-funnel/demo-request`)

- Creates a demo record (`pending_admin_review`) + an **admin follow-up draft** + a **dry-run schedule
  packet**.
- **No real calendar event is created** by default, even if a calendar integration exists.
- Statuses: `requested, pending_admin_review, scheduled_draft, completed, cancelled, archived`.

## Follow-up drafts

- `leadFollowupDrafts.generate(lead, type, opts)` — types: whatsapp, email, demo, trial,
  setup_checklist, plan_recommendation, reseller, voice.
- Languages: English, Roman Urdu, Urdu-friendly mixed.
- **Drafts are never sent** (`send: false`). If a lead has no marketing consent, marketing drafts are
  **blocked** and only an admin-review note is returned.

## Lead scoring factors

Business-type fit, selected modules, plan interest, urgency keywords, demo/trial requested,
budget/plan, consent provided, high-value industry, reseller/agency interest.
