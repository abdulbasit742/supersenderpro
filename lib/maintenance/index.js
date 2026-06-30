'use strict';
/**
 * lib/maintenance/index.js - maintenance / read-only mode toggle.
 * For deploys, migrations, or incident response: pause writes (or all non-essential traffic)
 * cleanly with a 503 + Retry-After, while health/version/metrics stay reachable so probes and
 * the LB keep working.
 *
 * State is in-memory (per instance) with an optional persisted flag in the platform namespace so
 * a multi-instance fleet can share it. Modes: 'off' | 'read-only' | 'full'.
 */
let repo = null; try { repo = require('../db'); } catch {}
const PLATFORM = '__platform__';
const COLLECTION = 'maintenance';

let state = { mode: process.env.MAINTENANCE_MODE || 'off', message: '', since: null, retryAfterSec: Number(process.env.MAINTENANCE_RETRY_AFTER || 120) };

async function persist() { if (!repo) return; try { const rows = await repo.list(PLATFORM, COLLECTION, {}); if (rows[0]) await repo.update(PLATFORM, COLLECTION, rows[0].id, state); else await repo.create(PLATFORM, COLLECTION, state); } catch {} }

async function loadPersisted() { if (!repo) return state; try { const rows = await repo.list(PLATFORM, COLLECTION, {}); if (rows[0]) state = { mode: rows[0].mode, message: rows[0].message, since: rows[0].since, retryAfterSec: rows[0].retryAfterSec || state.retryAfterSec }; } catch {} return state; }

function status() { return Object.assign({}, state, { active: state.mode !== 'off' }); }

async function set(mode, { message, retryAfterSec } = {}) {
  if (!['off', 'read-only', 'full'].includes(mode)) throw new Error('mode must be off | read-only | full');
  state = { mode, message: message || (mode === 'off' ? '' : 'Scheduled maintenance in progress'), since: mode === 'off' ? null : new Date().toISOString(), retryAfterSec: retryAfterSec || state.retryAfterSec };
  await persist();
  return status();
}

module.exports = { status, set, loadPersisted, state: () => state };
