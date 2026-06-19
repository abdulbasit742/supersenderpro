# SuperSender Pro ChatGPT Connector

This connector exposes a safe OpenAPI action server for Custom GPTs.

## Start

From the project root:

```powershell
cd .\mcp
npm run start:chatgpt
```

Or let the main SuperSender server start it automatically:

```text
GPT_CONNECTOR_ENABLED=true
GPT_CONNECTOR_PORT=3002
GPT_CONNECTOR_PUBLIC_URL=https://app.pakentrepreneur.me/gpt
GPT_CONNECTOR_API_KEY=change-this-strong-token
SUPERSENDER_API_BASE=http://localhost:3001
```

Then restart the main server and check:

```text
http://localhost:3001/api/gpt-connector/status
http://localhost:3002/health
http://localhost:3002/openapi.json
```

## Custom GPT Setup

1. Open the GPT builder.
2. Add an Action.
3. Import schema from:

```text
https://your-public-domain/openapi.json
```

4. Set authentication to API key / bearer token.
5. Paste the same value as `GPT_CONNECTOR_API_KEY`.

## Safety Model

By default, sensitive actions create approval drafts instead of sending live:

- `send_whatsapp_message`
- `publish_social_post`
- `create_action_draft`

Direct sending stays blocked unless this is explicitly enabled:

```text
GPT_CONNECTOR_ALLOW_DIRECT_ACTIONS=1
```

Keep direct actions disabled for normal operations. Review drafts in the dashboard or via `/api/mcp/action-drafts`.

## Main Action Endpoint

```http
POST /api/gpt/action
Authorization: Bearer <GPT_CONNECTOR_API_KEY>
Content-Type: application/json
```

Example:

```json
{
  "action": "completion_report",
  "args": {}
}
```

Example safe WhatsApp draft:

```json
{
  "action": "send_whatsapp_message",
  "args": {
    "number": "923001234567",
    "message": "Salam, your order is ready."
  }
}
```
