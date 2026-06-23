// lib/platformControl/deploymentChecklist.js — read-only deployment checklist preview.
'use strict';
const cfg = require('./config');

function getDeploymentChecklist() {
  const items = [
    { id: 'env_required', label: 'Required env keys configured', ok: cfg.REQUIRED_ENV.every((k) => process.env[k] !== undefined) },
    { id: 'session_secret', label: 'Session secret configured', ok: !!process.env.SESSION_SECRET },
    { id: 'dockerfile', label: 'Dockerfile present', ok: cfg.exists('Dockerfile') },
    { id: 'package_json', label: 'package.json present', ok: cfg.exists('package.json') },
    { id: 'server_entry', label: 'server.js entry present', ok: cfg.exists('server.js') },
    { id: 'backup_scripts', label: 'Backup + restore scripts present', ok: cfg.exists('scripts/backup-data.js') && cfg.exists('scripts/restore-data.js') },
    { id: 'health_script', label: 'Health check script present', ok: cfg.exists('scripts/healthCheck.js') },
    { id: 'platform_control', label: 'Platform Control installed', ok: cfg.exists('routes/platformControlRoutes.js') },
  ];
  const checklistPreview = items.map((i) => ({ id: i.id, label: i.label, statusPreview: i.ok ? 'ready' : 'pending' }));
  const pendingPreview = checklistPreview.filter((i) => i.statusPreview === 'pending').map((i) => i.id);
  return cfg.safetyFlags({
    checklistPreview,
    readyCountPreview: checklistPreview.length - pendingPreview.length,
    totalPreview: checklistPreview.length,
    pendingPreview,
    warnings: pendingPreview.length ? ['deployment_items_pending_preview'] : [],
    blockers: [],
  });
}
module.exports = { getDeploymentChecklist };
