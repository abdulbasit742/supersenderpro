'use strict';

/**
 * Mock Gateway — JSON-file event log of mock previews. Stores redacted summaries only.
 */


const fs = require('fs');
const path = require('path');
const redactor = require('./mockRedactor');

const STORE_PATH = process.env.MOCK_GATEWAY_EVENTS_PATH || 'data/mock-gateway-events.json';
const MAX = parseInt(process.env.MOCK_GATEWAY_MAX_EVENTS, 10) || 500;

function resolve() { return path.join(process.cwd(), STORE_PATH); }
function ensure() { try { const p = resolve(); const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d, {
recursive: true }); if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ events: [] }, null, 2)); } catch (e) {} }
function read() { ensure(); try { const p = JSON.parse(fs.readFileSync(resolve(), 'utf8')); if (!Array.isArray(p.events))
p.events = []; return p; } catch (e) { return { events: [] }; } }
function write(d) { try { if (d.events.length > MAX) d.events = d.events.slice(-MAX); fs.writeFileSync(resolve(),
JSON.stringify(d, null, 2)); return true; } catch (e) { return false; } }

function record(evt) {
  const safe = redactor.redact({
      provider: evt.provider, action: evt.action, status: evt.status,
      dryRun: true, warnings: evt.warnings || [], at: new Date().toISOString(),
  });
  const d = read(); d.events.push(safe); write(d); return safe;
}
function list(limit) { const items = read().events.slice().reverse(); return typeof limit === 'number' ? items.slice(0,
limit) : items; }
function status() { ensure(); let w = false; try { fs.accessSync(resolve(), fs.constants.W_OK); w = true; } catch (e) {}
return { path: STORE_PATH, writable: w, events: read().events.length, maxEvents: MAX }; }

module.exports = { record, list, status };
