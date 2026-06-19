# SuperSender Pro MCP

This custom MCP server lets MCP-compatible AI tools control and inspect the local SuperSender Pro system.

## What It Exposes

- Server health and dashboard summary
- WhatsApp connection status
- Customers, orders, plans, and inbox
- WhatsApp send/reply actions
- Broadcast creation
- Social account listing and post publishing
- Safe action drafts with an approval queue
- Local business data search

## Run Manually

From the project root:

```powershell
.\node-local.exe .\mcp\supersender-mcp.js
```

The MCP server uses stdio, so it will wait silently for JSON-RPC messages from an MCP client.

## Claude Desktop / Cursor Config

Use this as a template:

```json
{
  "mcpServers": {
    "supersender-pro": {
      "command": "C:\\Users\\bsphy2304\\Documents\\New project\\supersender-pro-final\\node-local.exe",
      "args": [
        "C:\\Users\\bsphy2304\\Documents\\New project\\supersender-pro-final\\mcp\\supersender-mcp.js"
      ],
      "env": {
        "SUPERSENDER_API_BASE": "http://localhost:3001"
      }
    }
  }
}
```

## Claude Web Custom Connector

Claude's "Add custom connector" screen needs a public HTTPS MCP URL.

Paste these values:

```text
Name: SuperSender Pro
Remote MCP server URL: https://app.pakentrepreneur.me/mcp
OAuth Client ID: leave blank
OAuth Client Secret: leave blank
```

The local MCP endpoint is:

```text
http://localhost:3001/mcp
```

Claude Web cannot use `localhost`, so keep the Cloudflare tunnel running before adding the connector.

Action tools such as WhatsApp sending and social publishing are disabled by default for safety. To enable them, set this in `.env` and restart the server:

```text
MCP_ALLOW_ACTIONS=1
```

## Safe Approval Queue

For daily work, use drafts first instead of direct sending:

1. Ask Claude to call `create_action_draft`.
2. Review drafts with `list_action_drafts` or `GET /api/mcp/action-drafts`.
3. Reject with `reject_action_draft` if needed.
4. Approve only when you are ready.

Approval execution is blocked unless this is enabled:

```text
MCP_ALLOW_ACTIONS=1
```

Draft examples:

```json
{
  "type": "whatsapp_message",
  "title": "Reply to Abdul",
  "payload": {
    "number": "923001234567",
    "message": "Salam Abdul, ChatGPT Plus available hai. Rs 999 limited offer."
  }
}
```

```json
{
  "type": "social_post",
  "title": "Daily AI tools offer",
  "payload": {
    "platform": "facebook",
    "message": "ChatGPT Plus, Claude Pro aur Cursor Pro available hain. DM for today rates.",
    "imageUrl": "https://example.com/post.jpg"
  }
}
```

## Available Tools

- `supersender_health`
- `whatsapp_status`
- `dashboard_summary`
- `list_customers`
- `list_orders`
- `list_plans`
- `list_inbox`
- `send_whatsapp_message`
- `reply_inbox`
- `create_broadcast`
- `list_social_accounts`
- `publish_social_post`
- `create_action_draft`
- `list_action_drafts`
- `reject_action_draft`
- `approve_action_draft`
- `search_business_data`
- `read_data_file`

## Notes

Keep `http://localhost:3001` running before using the MCP tools that call the API. Local JSON search tools still work even when the web server is offline.

## ChatGPT Custom GPT Connector

Custom GPT Actions use the OpenAPI connector in `mcp/chatgpt/server.js`.

Run it manually:

```powershell
cd .\mcp
npm run start:chatgpt
```

Or let the main app start it:

```text
GPT_CONNECTOR_ENABLED=true
GPT_CONNECTOR_PORT=3002
GPT_CONNECTOR_PUBLIC_URL=https://app.pakentrepreneur.me
GPT_CONNECTOR_API_KEY=change-this-strong-token
```

Status:

```text
http://localhost:3001/api/gpt-connector/status
http://localhost:3002/openapi.json
```

Full instructions are in `mcp/chatgpt/README.md`.
