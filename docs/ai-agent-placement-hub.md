# AI Agent Placement Hub

AI Agent Placement Hub lets an admin attach any SuperSender AI agent to a
specific WhatsApp group, WhatsApp channel, social platform, Telegram channel or
ecommerce event source.

## What it adds

- Select an existing AI agent.
- Select a target type:
  - `whatsapp_group`
  - `whatsapp_channel`
  - `facebook`
  - `instagram`
  - `linkedin`
  - `tiktok`
  - `telegram`
  - `ecommerce`
- Choose a mode:
  - `suggest_only`
  - `auto_reply`
  - `auto_forward`
  - `moderate`
  - `answer_faq`
- Add keywords and target-specific instructions.
- Require approval before live send/post.
- Enable, disable or remove deployments.
- Preview which agent will handle a sample message/event.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/agents/placement-targets` | Discover selectable groups, channels, social and ecommerce targets |
| GET | `/api/agents/placements` | List deployments with agent details |
| POST | `/api/agents/placements` | Create a deployment |
| PUT | `/api/agents/placements/:id` | Update a deployment |
| POST | `/api/agents/placements/:id/toggle` | Enable/disable a deployment |
| DELETE | `/api/agents/placements/:id` | Remove a deployment |
| POST | `/api/agents/placements/route-preview` | Preview target/message routing |

## Example

```bash
curl -X POST http://localhost:3001/api/agents/placements \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"support-agent\",\"targetType\":\"whatsapp_group\",\"targetId\":\"120363xxx@g.us\",\"mode\":\"suggest_only\",\"keywords\":\"support, issue, refund\",\"requireApproval\":true}"
```

## Safety

The first version stores deployments and previews routing. Live message or post
execution should still pass through the existing approval, Flow Studio, channel
automation and platform-token safety layers.
