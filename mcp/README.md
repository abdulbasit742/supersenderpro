# SuperSender Pro — Ultimate MCP Server Suite

This directory contains the custom Model Context Protocol (MCP) servers for **SuperSender Pro** (AI Business Command Center, WhatsApp CRM, and Social/SaaS Hub). 

We have successfully unified the codebase and built a **complete, state-of-the-art MCP Server** that exposes **48 comprehensive tools**! This server supports both standard **stdio transport** (for Cursor, Claude Desktop, and local AI clients) and **HTTP/SSE/ChatGPT endpoints**.

---

## 🌟 What's New? (Ported & Modularized)
We have upgraded the MCP suite to include:
1. **Standard Compliance**: Powered by the official `@modelcontextprotocol/sdk` (`mcp/index.js`).
2. **Unified Core**: Combines the original modular tools with the comprehensive system-level, approval, and file search tools.
3. **48 Full-Featured Tools**: 
   - **System Tools**: `supersender_health`, `whatsapp_status`, `dashboard_summary`, `list_plans`.
   - **WhatsApp Tools**: `send_whatsapp`, `send_whatsapp_image`, `get_bot_status`, `send_broadcast`, `get_recent_messages`, `send_whatsapp_message`.
   - **CRM & Customers**: `get_customers`, `get_customer_profile`, `add_customer_note`, `tag_customer`, `get_crm_stats`, `schedule_followup`, `export_customers`, `list_customers`.
   - **Orders & Analytics**: `list_orders`, `get_order`, `get_sales_analytics`, `get_customer_lifetime_value`.
   - **Stores & Products**: `list_stores`, `get_store`, `create_store`, `list_products`, `add_product`, `update_product`, `get_store_stats`.
   - **Campaigns & Stock**: `list_campaigns`, `create_campaign`, `get_campaign`, `add_campaign_product`, `list_stock`, `update_stock`.
   - **AI Brain**: `run_ai_action`, `query_ai`.
   - **Inbox Tools**: `list_inbox`, `reply_inbox`.
   - **Social Hub**: `list_social_accounts`, `publish_social_post`.
   - **Approval Queue**: `create_action_draft`, `list_action_drafts`, `reject_action_draft`, `approve_action_draft`.
   - **Local Files**: `search_business_data`, `read_data_file`.

---

## 🚀 Setup & Installation (How to Run)

First, make sure you install the dependencies inside this directory:
```bash
cd mcp
npm install
```

### 1. Run standard MCP (Recommended for Cursor & Claude)
To start the standard-compliant MCP server with stdio transport:
```bash
npm start
# or
node index.js
```

### 2. Run lightweight MCP (Zero-dependency custom server)
To start the zero-dependency manual JSON-RPC server:
```bash
node supersender-mcp.js
```

---

## 🛠️ Configuration in Clients

### Cursor / Claude Desktop Setup
Add this to your `claude_desktop_config.json` (usually at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "supersenderpro-modular": {
      "command": "node",
      "args": [
        "C:\\path\\to\\your\\project\\supersender-pro\\mcp\\index.js"
      ],
      "env": {
        "SUPERSENDER_URL": "http://localhost:3001",
        "SUPERSENDER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```
*(Replace `C:\\path\\to\\your\\project` with the actual path to your cloned repository)*

---

## 🔒 Safe Action Drafts & Approval Queue
For production workflows, you can restrict AI from sending messages or executing actions directly.
1. Ask the AI to call `create_action_draft`.
2. Inspect the queue with `list_action_drafts`.
3. Approve with `approve_action_draft` to execute the action via the SuperSender backend.
4. To allow direct actions without approval, set `MCP_ALLOW_ACTIONS=1` in your backend `.env` file.

---

## 💬 ChatGPT Custom GPT / OpenAPI
ChatGPT Custom GPTs connect via the OpenAPI server located in `mcp/chatgpt/server.js`.
To run the ChatGPT OpenAPI gateway:
```bash
npm run start:chatgpt
```
And add the `openapi.json` (served on port `3002`) to your Custom GPT Actions.
