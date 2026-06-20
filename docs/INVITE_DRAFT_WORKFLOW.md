# Invite Draft Workflow

Invites are **drafts only**. No live email/WhatsApp invite is sent, no real auth user is created, no invite token is generated or exposed.

## Invite draft model
`{ id, workspaceId, emailMasked, phoneMasked, roleId, seatType, inviteMessageDraft, status, expiresAtPreview, dryRun, createdAt }`

Statuses: draft, pending_approval, ready_to_send_preview, sent_manual, expired, cancelled.

## Flow
1. `POST /api/team-access/workspaces/:id/invite-draft` validates input, masks contact, builds a Roman-Urdu/English message draft.
2. With `TEAM_ACCESS_REQUIRE_APPROVAL=true` (default) the draft starts in `pending_approval`.
3. An operator may later send it manually after approval. The module never sends it.

## Rules
- Do not send invite email/WhatsApp live.
- Do not create a real auth user.
- Do not expose an invite token.
- Respect consent for external contacts (validator warns `confirm_consent_before_external_contact`).
