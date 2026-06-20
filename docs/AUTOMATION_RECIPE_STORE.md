# Automation Recipe Store

10 default recipes in `lib/templateMarketplace/recipeRegistry.js`. All are **dry-run by default** and every
outbound communication action is **draft-only** — no live WhatsApp/email/social/payment/tenant actions.

## Recipe model
`id, title, trigger, conditions, actions, modulesUsed, approvalRequired, dryRun, riskLevel, complianceNotes,
sampleInput, sampleOutput`

## Default recipes
1. New lead → Customer 360 preview → follow-up draft
2. New order → WhatsApp draft → owner alert
3. Payment pending → reminder draft → admin review
4. Channel post idea → approval queue → schedule draft
5. Voice transcript → support ticket → reply draft
6. Trial requested → onboarding checklist → owner task
7. Pilot high-risk → support escalation → follow-up draft
8. Reseller referral → partner lead preview → commission preview
9. Product price drop → campaign draft → KPI preview
10. Support ticket resolved → KB suggestion → feedback request draft

## Preview a recipe
`POST /api/template-marketplace/recipes/:id/preview` → returns draft steps with `live:false` for each action.
