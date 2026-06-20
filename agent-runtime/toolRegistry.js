'use strict';
// The ONLY tools an agent may touch. Everything funnels through here.
const fs = require('fs');
const path = require('path');
const { POLICY, isPathAllowed } = require('./policy');

async function api(method, route, body) {
  const headers = { 'content-type': 'application/json' };
  if (POLICY.apiKey) headers.authorization = `Bearer ${POLICY.apiKey}`;
  const res = await fetch(`${POLICY.apiBase}${route}`, {
    method, headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${route} -> HTTP ${res.status}: ${data && (data.error || data.message) || text}`);
  return data;
}

// risk: low = auto, medium/high = policy-gated. actionType maps to POLICY lists.
const TOOLS = {
  // ---- read-only / safe ----
  health:            { risk: 'low', actionType: 'read', desc: 'Server health',          run: () => api('GET', '/api/health') },
  dashboard_summary: { risk: 'low', actionType: 'read', desc: 'Dashboard summary',       run: () => api('GET', '/api/dashboard/summary') },
  whatsapp_status:   { risk: 'low', actionType: 'read', desc: 'WhatsApp connection',     run: () => api('GET', '/api/whatsapp/status') },
  list_customers:    { risk: 'low', actionType: 'read', desc: 'List customers',          run: (a) => api('GET', `/api/customers?limit=${Number(a.limit)||20}`) },
  list_orders:       { risk: 'low', actionType: 'read', desc: 'List orders',             run: (a) => api('GET', `/api/orders?limit=${Number(a.limit)||20}`) },
  list_inbox:        { risk: 'low', actionType: 'read', desc: 'List inbox',              run: () => api('GET', '/api/inbox') },
  search_business_data:{ risk:'low', actionType: 'read', desc: 'Search business data',   run: (a) => api('GET', `/api/search?q=${encodeURIComponent(a.query||'')}`) },
  read_data_file: {
    risk: 'low', actionType: 'read', desc: 'Read a data file (workspace-confined)',
    run: (a) => {
      const target = path.resolve(POLICY.dataDir, path.basename(String(a.file || '')));
      if (!isPathAllowed(target)) throw new Error('path outside allowed workspace');
      return { file: path.basename(target), content: fs.readFileSync(target, 'utf8').slice(0, 20000) };
    }
  },
  // ---- mutating / external (approval-gated) ----
  write_data_file: {
    risk: 'high', actionType: 'filesystem_write', desc: 'Write a data file (confined)',
    run: (a) => {
      const target = path.resolve(POLICY.dataDir, path.basename(String(a.file || '')));
      if (!isPathAllowed(target)) throw new Error('path outside allowed workspace');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, String(a.content ?? ''));
      return { written: path.basename(target), bytes: Buffer.byteLength(String(a.content ?? '')) };
    }
  },
  send_whatsapp_message: { risk: 'high', actionType: 'whatsapp_send', desc: 'Send a WhatsApp message',
    run: (a) => api('POST', '/api/whatsapp/send', { to: a.to, message: a.message }) },
  reply_inbox: { risk: 'medium', actionType: 'whatsapp_send', desc: 'Reply to an inbox thread',
    run: (a) => api('POST', '/api/inbox/reply', { id: a.id, message: a.message }) },
  create_broadcast: { risk: 'high', actionType: 'whatsapp_send', desc: 'Create a broadcast',
    run: (a) => api('POST', '/api/broadcasts', { name: a.name, message: a.message, audience: a.audience }) },
  publish_social_post: { risk: 'high', actionType: 'social_publish', desc: 'Publish a social post',
    run: (a) => api('POST', '/api/social/publish', { platform: a.platform, content: a.content }) },
  run_shell: { risk: 'high', actionType: 'shell_command', desc: 'Run a shell command (gated)',
    run: () => { throw new Error('shell execution requires live mode + explicit approval'); } }
};

function listTools() {
  return Object.entries(TOOLS).map(([name, t]) => ({
    name, risk: t.risk, actionType: t.actionType, description: t.desc
  }));
}
function getTool(name) { return TOOLS[name] || null; }

module.exports = { TOOLS, listTools, getTool, api };
