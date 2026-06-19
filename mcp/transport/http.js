const { ServerTransport } = require('@modelcontextprotocol/sdk/server/index.js');
const express = require('express');
const bodyParser = require('body-parser');

/**
 * Simple HTTP transport for MCP server.
 * It starts an Express server that forwards incoming JSON-RPC requests
 * to the underlying MCP Server instance.
 */
class HttpTransport extends ServerTransport {
  constructor(port = 3002) {
    super();
    this.port = port;
    this.app = express();
    this.app.use(bodyParser.json());
    // Endpoint to receive MCP requests
    this.app.post('/mcp', async (req, res) => {
      try {
        const result = await this.server.handleRequest(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  /**
   * Connect the transport to an MCP Server instance.
   * This method is called by the server code.
   * @param {Server} server
   */
  async connect(server) {
    this.server = server;
    this.app.listen(this.port, () => {
      console.error(`[MCP] HTTP transport listening on port ${this.port}`);
    });
  }
}

module.exports = { HttpTransport };
