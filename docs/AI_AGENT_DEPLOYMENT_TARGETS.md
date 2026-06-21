  # AI Agent Deployment — Targets & Modes

  ## Target types
  whatsapp_chat, whatsapp_group, whatsapp_channel, ecommerce_store, social_platform,
  voice_ai, marketplace_intelligence, support_inbox, payment_workflow,
  order_workflow, flow_studio

  ## Deployment modes
  | Mode | Behavior |
  | --- | --- |
  | suggest_only | agent proposes; nothing leaves the system (default) |
  | draft_only | agent creates drafts for admin review |
  | approval_required | drafts queued; admin must approve each |
  | supervised_live | live execution, only if target live flag on + approval |
  | disabled | deployment off |

  ## Live flags by target
  | Target | Env flag (default false) |
  | --- | --- |
  | whatsapp_chat / whatsapp_group | AGENT_DEPLOYMENT_ALLOW_LIVE_WHATSAPP |
  | whatsapp_channel | AGENT_DEPLOYMENT_ALLOW_LIVE_CHANNEL |
  | social_platform | AGENT_DEPLOYMENT_ALLOW_LIVE_SOCIAL |
  | ecommerce_store / order_workflow | AGENT_DEPLOYMENT_ALLOW_LIVE_ECOMMERCE |
  | payment_workflow | AGENT_DEPLOYMENT_ALLOW_LIVE_PAYMENT |
  | voice_ai | AGENT_DEPLOYMENT_ALLOW_LIVE_VOICE |
  | marketplace_intelligence / support_inbox / flow_studio | (none, draft-only) |

artifacts/ai_agent_deployment_inventory.json +
