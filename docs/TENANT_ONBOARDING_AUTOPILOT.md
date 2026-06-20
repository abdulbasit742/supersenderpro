# Tenant Onboarding Autopilot

The autopilot turns a business type into a prioritized setup plan and a generated task list, then
tracks progress to pilot.

## Flow
1. Owner sets the **business profile** (type, country, timezone, currency, goals).
2. `autopilotPlanner.plan(businessType)` returns the recommended step path for that type,
   annotated with each step's current status.
3. `onboardingTasks.generate()` creates tasks for every step that is not yet configured.
4. As the owner verifies steps / adds credentials, the **readiness score** rises.
5. When required steps + required credentials are satisfied, status reaches `pilot_ready`.

## Readiness statuses
`blocked · setup_needed · dry_run_ready · pilot_ready · production_ready_with_credentials`

## API
- `POST /api/unified-setup/autopilot/plan` `{ businessType }`
- `GET  /api/unified-setup/readiness`
- `POST /api/unified-setup/tasks/generate`
- `POST /api/unified-setup/tasks/:id/done|skip|snooze`

## Multi-tenant note
Tenant coordination is handled through the business profile + step overrides. The wizard does not
replace any existing tenant/CRM layer; it sits on top and connects to it.
