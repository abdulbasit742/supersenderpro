'use strict';


/**
 * No-Code Flows — JSON-file store (no DB). Defensive; never throws.
 */


const fs = require('fs');
const path = require('path');

const STORE_PATH = process.env.NO_CODE_FLOWS_STORE_PATH || 'data/no-code-flows.json';
const MAX = parseInt(process.env.NO_CODE_FLOWS_MAX, 10) || 500;

function resolve() { return path.join(process.cwd(), STORE_PATH); }
function ensure() { try { const p = resolve(); const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d, {
recursive: true }); if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ flows: [] }, null, 2)); } catch (e) {} }
function read() { ensure(); try { const p = JSON.parse(fs.readFileSync(resolve(), 'utf8')); if (!Array.isArray(p.flows))
p.flows = []; return p; } catch (e) { return { flows: [] }; } }
function write(d) { try { if (d.flows.length > MAX) d.flows = d.flows.slice(-MAX); fs.writeFileSync(resolve(),
JSON.stringify(d, null, 2)); return true; } catch (e) { return false; } }
function writable() { ensure(); try { fs.accessSync(resolve(), fs.constants.W_OK); return true; } catch (e) { return
false; } }


module.exports = { read, write, writable, STORE_PATH, MAX };
