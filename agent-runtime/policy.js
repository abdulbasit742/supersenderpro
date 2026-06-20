'use strict';
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function envList(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
function envBool(name, def) {
  const v = process.env[name];
  if (v === undefined) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

const DATA_DIR = process.env.AGENT_RUNTIME_DATA
  || path.join(PROJECT_ROOT, 'data', 'agent-runtime');

// Cross-platform: default allowed workspaces are the project + runtime data dir.
const ALLOWED_WORKSPACES = Array.from(new Set([
  PROJECT_ROOT,
  DATA_DIR,
  ...envList('AGENT_RUNTIME_ALLOWED_WORKSPACES')
].map(p => path.resolve(p))));

const POLICY = {
  projectRoot: PROJECT_ROOT,
  dataDir: DATA_DIR,
  defaultMode: process.env.AGENT_RUNTIME_DEFAULT_MODE || 'supervised',
  // Safe by default: dry-run on, live (write/external) actions off.
  dryRunDefault: envBool('AGENT_RUNTIME_DRY_RUN_DEFAULT', true),
  liveActionsEnabled: envBool('AGENT_RUNTIME_LIVE_ACTIONS', false),
  allowYolo: envBool('AGENT_RUNTIME_ALLOW_YOLO', false),
  allowedWorkspaces: ALLOWED_WORKSPACES,
  // Never executable, by anyone, ever.
  blockedActions: envList('AGENT_RUNTIME_BLOCKED_ACTIONS', [
    'delete_files', 'format_disk', 'credential_dump',
    'cold_broadcast', 'payment_approve_live', 'social_post_live_without_approval'
  ]),
  // Always require explicit human approval before execution.
  approvalRequired: envList('AGENT_RUNTIME_APPROVAL_REQUIRED', [
    'filesystem_write', 'shell_command', 'browser_action',
    'whatsapp_send', 'social_publish', 'payment_delivery', 'git_push'
  ]),
  apiBase: (process.env.SUPERSENDER_API_BASE || 'http://localhost:3001').replace(/\/+$/, ''),
  apiKey: process.env.SUPERSENDER_MCP_API_KEY || process.env.MCP_API_KEY || '',
  runtimeApiKey: process.env.AGENT_RUNTIME_API_KEY || ''
};

/** Is the resolved path inside an allowed workspace? */
function isPathAllowed(target) {
  if (!target) return false;
  const resolved = path.resolve(target);
  return POLICY.allowedWorkspaces.some(ws => {
    const rel = path.relative(ws, resolved);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

module.exports = { POLICY, isPathAllowed, PROJECT_ROOT, envBool, envList };
