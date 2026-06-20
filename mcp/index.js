const { Server }   = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const cors = require('cors');

// Import all tool definitions
const storeTools    = require('./tools/storeTool');
const whatsappTools = require('./tools/whatsappTool');
const crmTools      = require('./tools/crmTool');
const orderTools    = require('./tools/orderTool');
const analyticsTools = require('./tools/analyticsTool');
const campaignTools = require('./tools/campaignTool');
const stockTools    = require('./tools/stockTool');
const aiTools       = require('./tools/aiTool');
const systemTools    = require('./tools/systemTool');
const inboxTools     = require('./tools/inboxTool');
const socialTools    = require('./tools/socialTool');
const approvalTools  = require('./tools/approvalTool');
const fileTools      = require('./tools/fileTool');

// Advanced SaaS/Command Center Tools
const dealerIntelligenceTools = require('./tools/dealerIntelligenceTool');
const paymentsTools           = require('./tools/paymentsTool');
const ratesTools              = require('./tools/ratesTool');
const zeroTouchTools          = require('./tools/zeroTouchTool');
const alertTools             = require('./tools/alertTool');
const dealersTools            = require('./tools/dealersTool');

// Base URL of SuperSenderPro server
const BASE_URL = process.env.SUPERSENDER_URL || 'http://localhost:3001';
const API_KEY  = process.env.SUPERSENDER_API_KEY || '';

// All tools combined (79 tools!)
const ALL_TOOLS = [
  ...storeTools.definitions,
  ...whatsappTools.definitions,
  ...crmTools.definitions,
  ...orderTools.definitions,
  ...analyticsTools.definitions,
  ...campaignTools.definitions,
  ...stockTools.definitions,
  ...aiTools.definitions,
  ...systemTools.definitions,
  ...inboxTools.definitions,
  ...socialTools.definitions,
  ...approvalTools.definitions,
  ...fileTools.definitions,
  ...dealerIntelligenceTools.definitions,
  ...paymentsTools.definitions,
  ...ratesTools.definitions,
  ...zeroTouchTools.definitions,
  ...alertTools.definitions,
  ...dealersTools.definitions,
];

// Tool handler map
const HANDLERS = {
  ...storeTools.handlers,
  ...whatsappTools.handlers,
  ...crmTools.handlers,
  ...orderTools.handlers,
  ...analyticsTools.handlers,
  ...campaignTools.handlers,
  ...stockTools.handlers,
  ...aiTools.handlers,
  ...systemTools.handlers,
  ...inboxTools.handlers,
  ...socialTools.handlers,
  ...approvalTools.handlers,
  ...fileTools.handlers,
  ...dealerIntelligenceTools.handlers,
  ...paymentsTools.handlers,
  ...ratesTools.handlers,
  ...zeroTouchTools.handlers,
  ...alertTools.handlers,
  ...dealersTools.handlers,
};

// HTTP helper
async function apiCall(method, path, body = null) {
  const axios = require('axios');
  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) },
  };
  if (body) config.data = body;
  try {
    const res = await axios(config);
    return res.data;
  } catch (err) {
    return { error: err.response?.data?.error || err.message };
  }
}

global.mcpApiCall = apiCall;

// Create MCP server
const server = new Server(
  { name: 'supersenderpro', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List all tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = HANDLERS[name];

  if (!handler) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }

  try {
    const result = await handler(args || {});
    return {
      content: [{
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// SSE Transport Active Sessions Map
const sseTransports = new Map();

// Start Transport
async function main() {
  const useHttp = process.argv.includes('--transport=http') || process.env.MCP_TRANSPORT === 'http';

  if (useHttp) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // GET /sse establishes standard Server-Sent Events stream
    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/message', res);
      sseTransports.set(transport.sessionId, transport);
      
      // Connect MCP server to this specific client transport
      await server.connect(transport);
      console.error(`[MCP] Cloud client connected via SSE (Session ID: ${transport.sessionId})`);

      req.on('close', () => {
        sseTransports.delete(transport.sessionId);
        console.error(`[MCP] Cloud client disconnected (Session ID: ${transport.sessionId})`);
      });
    });

    // POST /message handles JSON-RPC messages routed to specific session
    app.post('/message', async (req, res) => {
      const { sessionId } = req.query;
      const transport = sseTransports.get(sessionId);
      if (!transport) {
        return res.status(404).send('MCP Session not found or expired.');
      }
      await transport.handlePostMessage(req, res);
    });

    const PORT = process.env.MCP_PORT || process.env.PORT || 3005;
    app.listen(PORT, () => {
      console.error(`[MCP] SuperSenderPro Dual-Transport MCP HTTP/SSE Server running on http://localhost:${PORT}`);
      console.error(`[MCP] SSE Stream URL: http://localhost:${PORT}/sse`);
      console.error(`[MCP] Message Post URL: http://localhost:${PORT}/message`);
    });
  } else {
    // Default Stdio Server Transport for Local CLI / Cursor / Claude Desktop
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] SuperSenderPro MCP Server running (stdio)');
  }
}

main().catch(console.error);
