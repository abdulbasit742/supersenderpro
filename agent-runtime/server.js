'use strict';
// Standalone Agent Sandbox Runtime service (own port; talks to SuperSender API).
//   node agent-runtime/server.js
const path = require('path');
const express = require('express');
const buildRouter = require('../routes/agentRuntime');
const runtime = require('./index');

const PORT = Number(process.env.AGENT_RUNTIME_PORT || 3005);
const app = express();

// CORS allowlist (comma-separated origins; '*' allowed in dev).
const ORIGINS = (process.env.AGENT_RUNTIME_CORS || '*').split(',').map(s => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ORIGINS.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'agent-runtime', port: PORT }));

// Web dashboard (queue approve/reject UI) served from ./public
app.use(express.static(path.join(__dirname, 'public')));

app.use(buildRouter(express));

app.listen(PORT, () => {
  const s = runtime.getStatus();
  console.log(`[agent-runtime] listening on :${PORT}`);
  console.log(`[agent-runtime] mode=${s.mode} dryRun=${s.policy.dryRunDefault} liveActions=${s.policy.liveActionsEnabled} tools=${s.tools.length}`);
});
