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
| POST | `/api/agent-runtime/explain` | `{tool,args}` → why it would be allowed/blocked/queued |
| GET  | `/api/agent-runtime/runs` | Run history (audit log) + stats |
| GET  | `/api/agent-runtime/runs/:id` | A single recorded run |
| GET  | `/api/agent-runtime/metrics` | JSON, or Prometheus text with `?format=prometheus` |
| GET  | `/api/agent-runtime/templates` | List pre-approved action templates |
| POST | `/api/agent-runtime/templates` | Create a new template (admin) |
| POST | `/api/agent-runtime/templates/:id/execute` | Execute a template (skips approval queue) |
| POST | `/api/agent-runtime/templates/:id/deactivate` | Deactivate a template |

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

## Operability features

- **Audit log** (`auditLog.js`) — every run is recorded to `data/agent-runtime/audit-log.json`; query via `/runs` or the dashboard's *Run history* panel.
- **Metrics** (`metrics.js`) — `/api/agent-runtime/metrics?format=prometheus` for Prometheus/Grafana scraping.
- **Approval notifications** (`notify.js`) — set `AGENT_RUNTIME_NOTIFY_URL` to get a webhook POST whenever an action needs approval.
- **Risky-action quota** — `AGENT_RUNTIME_MAX_RISKY_PER_RUN` (default 5) caps how many medium/high-risk actions a single live run may attempt; the rest are marked `quota_exceeded`.
- **Explain** — `POST /api/agent-runtime/explain {tool,args}` returns the sandbox decision + classification without executing.

## CLI
```bash
npm run agent:cli -- status
npm run agent:cli -- run "give me a sales overview and follow up cold leads"   # dry-run
npm run agent:cli -- run "send a reminder" --live                              # live (still gated)
npm run agent:cli -- queue        # approval queue
npm run agent:cli -- runs         # run history
npm run agent:cli -- approve <draftId>
npm run agent:cli -- explain send_whatsapp_message '{"to":"1","message":"hi"}'
npm run agent:cli -- metrics --prometheus
# pick an agent:  AGENT=crewai npm run agent:cli -- run "..."
```

### Action Templates
Pre-approved routine actions that skip the approval queue but remain sandboxed:
```bash
# Create a template
curl -X POST localhost:3005/api/agent-runtime/templates -H 'content-type: application/json' \
  -d '{"name":"welcome-new-customer","description":"Send welcome to new lead","tool":"send_whatsapp_message","args":{"to":"923000000000","message":"Welcome!"}}'

# List templates
npm run agent:cli -- templates

# Execute a template (no approval needed)
npm run agent:cli -- template-execute <template-id>
```

Useful for: welcome messages, daily status broadcasts, routine follow-ups, etc.