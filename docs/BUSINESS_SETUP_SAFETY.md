 # Business Setup — Safety Model

 ## Default posture
 Dry-run on (`BUSINESS_SETUP_DRY_RUN=true`), approval required
 (`BUSINESS_SETUP_REQUIRE_APPROVAL=true`), preset write off
 (`BUSINESS_SETUP_ALLOW_PRESET_WRITE=false`), live enable off
 (`BUSINESS_SETUP_ALLOW_LIVE_ENABLE=false`).

 ## Forbidden in this layer (always)
 send WhatsApp, post social/channel, write ecommerce products/orders, approve payments,
 enable live voice. The safety guard blocks these regardless of env.

 ## What applying a preset does / does not do
 DOES: create a local profile, compute recommendations, generate checklist + env +
 launch checklists, snapshot readiness.
 DOES NOT: enable modules, write to external platforms, store secrets, overwrite live config.

## PII
Phone masked to last 4, email masked, tokens/secrets redacted by key + pattern. History
is masked. Routes never return secrets.


## How to safely enable modules later
Enable each module through its own existing wizard (WhatsApp Cloud Setup, integration
wizard, etc.), verify the checklist item, then re-run readiness. Only flip
`BUSINESS_SETUP_ALLOW_LIVE_ENABLE` in a sandbox after review.

artifacts/business_setup_inventory.json +
