# Agent Sandbox Runtime

Run **any AI agent** against SuperSender Pro inside a confined, supervised sandbox.
The agent can only touch a fixed tool set, every risky action is approval-gated,
filesystem access is workspace-confined, and secrets are stripped before they ever
reach the agent.

## Why
> "Can any AI agent run inside this project's sandbox and stay within all my tools?"

Yes. This module is the enforcement layer that makes that safe.

## Architecture

```
goal ─▶ agent adapter (rule-based | Groq | OpenAI)   ← pluggable "any agent"
        └─▶ plan: [ {tool, args} ]
              └─▶ SANDBOX.evaluate()  ──┐
                    • blocked?          │  policy.js
                    • needs approval?   │  (allow / block / approval / dry-run)
                    • path confined?    │
                    • dry-run?          ┘
                      └─▶ tool registry (the ONLY 14 tools)  ─▶ SuperSender API
                            risky → approval queue (approve → execute)
```

| File | Role |
|---|---|
| `policy.js` | Cross-platform policy: allowed workspaces, blocked/approval actions, dry-run/live flags |
| `contextSanitizer.js` | Strips tokens, `.env`, sessions, payment & customer-private data |
| `toolRegistry.js` | The confined tool set (reads auto, mutations gated) |
| `sandbox.js` | Enforcement core: `evaluate()`, `execute()`, `executeApproved()` |
| `agents.js` | Pluggable agent adapters (deterministic + LLM) |
| `approvalQueue.js` | Durable JSON approval queue |
| `index.js` | Facade: `getStatus / plan / run / queue / approveAndRun` |
| `server.js` | Standalone HTTP service (port 3005) |

## Safety defaults
- **Supervised + dry-run ON** (`AGENT_RUNTIME_DRY_RUN_DEFAULT=true`)
- **Live high-risk actions OFF** (`AGENT_RUNTIME_LIVE_ACTIONS=false`)
- Blocked forever: `delete_files, format_disk, credential_dump, cold_broadcast, payment_approve_live`
- Approval required: `filesystem_write, shell_command, browser_action, whatsapp_send, social_publish, payment_delivery, git_push`

## Quick start
```bash
node agent-runtime/demo.js "give me a sales overview and follow up cold leads"   # dry-run demo
node --test agent-runtime/__tests__/                                             # tests
node agent-runtime/server.js                                                     # HTTP service :3005
```

## HTTP API (port 3005)
| Method | Path | Description |
|---|---|---|
| GET  | `/health` | Liveness |
| GET  | `/api/agent-runtime/status` | Policy, tools, agents, queue stats |
| GET  | `/api/agent-runtime/tools` | Confined tool list |
| GET  | `/api/agent-runtime/agents` | Available agent adapters |
| POST | `/api/agent-runtime/plan` | `{goal, agent}` → plan (no execution) |
| POST | `/api/agent-runtime/run`  | `{goal, agent, dryRun, approved}` → transcript |
| GET  | `/api/agent-runtime/queue` | Pending/approved/executed drafts |
| POST | `/api/agent-runtime/queue/:id/approve` | Approve **and execute** a draft |
| POST | `/api/agent-runtime/queue/:id/reject` | Reject a draft |

Set `AGENT_RUNTIME_API_KEY` to require `Authorization: Bearer <key>` on every route.

## Embedding in the main server (optional)
```js
const express = require('express');
app.use(require('./routes/agentRuntime')(express));
```

## Plugging in a different agent
Add an adapter in `agents.js`:
```js
AGENTS.mycrew = { name: 'My Crew', kind: 'llm', plan: async (goal) => ([{ tool: 'list_orders', args: {}, rationale: '...' }]) };
```
Whatever it returns is still forced through the sandbox — it can never exceed the tool set or policy.
