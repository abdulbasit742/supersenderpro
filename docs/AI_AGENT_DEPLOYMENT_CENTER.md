 # AI Agent Deployment Center

 One place to deploy and control AI agents across every SuperSender Pro channel.
 This is a **coordination layer only**. It does not rebuild any AI provider, Flow
 Studio, Voice AI, Channel Automation, Group Commerce OS, or Marketplace Intelligence.
 It reuses them as deployment targets.


 ## What it does
 - Central agent registry (14 agent types) with safe defaults.
 - Deployments map an agent to a target (chat, group, channel, ecommerce, social,
   voice, marketplace, support inbox, payments, orders, Flow Studio).
 - Draft action builder: every agent action is a preview, never a live send.
 - Safety guard: live actions blocked unless explicitly enabled AND approved.
 - Flow Studio hooks: trigger/action registry entries (append-only, no new engine).
 - Dashboard: overview, registry, deployment matrix, editor, action tester,
   flow hooks, safety/audit.


 ## Systems it reuses (not rebuilt)
 | Target | Reuses |
 | --- | --- |
 | whatsapp_chat / support_inbox | omnichannel inbox + WABA router |
 | whatsapp_group | Group Commerce OS |
 | whatsapp_channel | Channel Automation |
 | ecommerce_store / order_workflow | catalog + checkout |
 | social_platform | social hub |
 | voice_ai | Voice AI module |
 | marketplace_intelligence | Marketplace Intelligence layer |
 | payment_workflow | payments module |
 | flow_studio | Flow Studio (lib/superflow) |

 ## How to deploy an agent
 1. Create an agent (`POST /api/agent-deployment/agents`).
 2. Create a deployment to a target (`POST /api/agent-deployment/deployments`),
    default mode `suggest_only`, dry-run on, approval required.
 3. Test it (`POST /api/agent-deployment/deployments/:id/test`) - always dry-run.
 4. Review drafts in the dashboard action tester.

 ## How to test
 ```bash
 npm run agent-deployment:check
 npm run agent-deployment:smoke
 node server.js && curl localhost:3001/api/agent-deployment/status


What not to commit
data/*.json , artifacts/* , real .env . Only .env.example placeholders ship.
