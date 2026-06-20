'use strict';
const { ServerTransport } = require('@modelcontextprotocol/sdk/server/index.js');
const express = require('express');
const bodyParser = require('body-parser');

/**
 * Hardened HTTP transport for the MCP server.
 * Adds: bearer auth (MCP_HTTP_API_KEY), per-IP rate limiting, CORS allowlist,
 * body size limit, and a /health probe. Backwards compatible with `new HttpTransport(port)`.
 */
class HttpTransport extends ServerTransport {
  constructor(port = 3002, opts = {}) {
    super();
    this.port = Number(process.env.MCP_HTTP_PORT || port);
    this.apiKey = process.env.MCP_HTTP_API_KEY || opts.apiKey || '';
    this.origins = (process.env.MCP_HTTP_CORS || opts.cors || '*').split(',').map(s => s.trim());
    this.app = express();

    // CORS
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (this.origins.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
      else if (origin && this.origins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    this.app.use(bodyParser.json({ limit: process.env.MCP_HTTP_BODY_LIMIT || '512kb' }));

    // Rate limiting (per IP)
    const hits = new Map();
    const windowMs = Number(process.env.MCP_HTTP_RATE_WINDOW_MS || 60000);
    const max = Number(process.env.MCP_HTTP_RATE_MAX || 120);
    this.app.use((req, res, next) => {
      const key = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      const rec = hits.get(key) || { count: 0, reset: now + windowMs };
      if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
      rec.count += 1; hits.set(key, rec);
      if (rec.count > max) return res.status(429).json({ error: 'rate limit exceeded' });
      next();
    });

    // Bearer auth (enforced only when MCP_HTTP_API_KEY is set)
    this.app.use((req, res, next) => {
      if (req.path === '/health') return next();
      if (!this.apiKey) return next();
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
      if (token !== this.apiKey) return res.status(401).json({ error: 'unauthorized' });
      next();
    });

    this.app.get('/health', (req, res) => res.json({ ok: true, service: 'mcp-http', port: this.port }));

    this.app.post('/mcp', async (req, res) => {
      try {
        const result = await this.server.handleRequest(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  async connect(server) {
    this.server = server;
    this.app.listen(this.port, () => {
      console.error(`[MCP] HTTP transport listening on :${this.port} (auth=${this.apiKey ? 'on' : 'off'})`);
    });
  }
}

module.exports = { HttpTransport };
