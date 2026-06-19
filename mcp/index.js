const { Server }   = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// Import all tool definitions
const storeTools    = require('./tools/storeTool');
const whatsappTools = require('./tools/whatsappTool');
const crmTools      = require('./tools/crmTool');
const orderTools    = require('./tools/orderTool');
const analyticsTools = require('./tools/analyticsTool');
const campaignTools = require('./tools/campaignTool');
const stockTools    = require('./tools/stockTool');
const aiTools       = require('./tools/aiTool');

// Base URL of SuperSenderPro server
const BASE_URL = process.env.SUPERSENDER_URL || 'http://localhost:3001';
const API_KEY  = process.env.SUPERSENDER_API_KEY || '';

// All tools combined
const ALL_TOOLS = [
  ...storeTools.definitions,
  ...whatsappTools.definitions,
  ...crmTools.definitions,
  ...orderTools.definitions,
  ...analyticsTools.definitions,
  ...campaignTools.definitions,
  ...stockTools.definitions,
  ...aiTools.definitions,
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

// Start with stdio transport (for Claude Desktop)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] SuperSenderPro MCP Server running (stdio)');
}

main().catch(console.error);
