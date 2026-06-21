 # AI Agent Deployment — Safety Model


 ## Default posture
 Every agent and deployment defaults to: `enabled=false`, `dryRun=true`,
 `approvalRequired=true`, `mode=suggest_only`. No agent performs a live action by default.

 ## Live action gates (ALL must be true)
 1. `AGENT_DEPLOYMENT_DRY_RUN=false` (global)
 2. The target's `ALLOW_LIVE_*` env flag = true
 3. Agent `dryRun=false`
 4. Admin approval present on the action
 5. Under the per-hour rate limit


 Risky actions (whatsapp/channel/social/voice/ecommerce/order/payment drafts) also
 require explicit `approved=true` even when gates are open.


 ## Always blocked by default
 - live WhatsApp sends
 - payment approvals
 - ecommerce/order writes
 - social/channel posting
 - voice sends
 - group remove/delete actions


 ## PII
 Phone numbers masked to last 4, emails masked, tokens/secrets redacted by key name
 and value pattern. Raw message bodies are not stored. Audit log is masked.

 ## Rate limiting
 Per-agent hourly bucket, capped by `AGENT_DEPLOYMENT_MAX_ACTIONS_PER_HOUR`.
