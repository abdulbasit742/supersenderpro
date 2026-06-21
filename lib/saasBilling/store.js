'use strict';

/** SaaS Billing — JSON-file store helpers (no DB). Defensive; never throws. */

const fs = require('fs');
const path = require('path');
function resolve(p) { return path.join(process.cwd(), p); }
function ensure(p, initial) { try { const full = resolve(p); const dir = path.dirname(full); if (!fs.existsSync(dir))
fs.mkdirSync(dir, { recursive: true }); if (!fs.existsSync(full)) fs.writeFileSync(full, JSON.stringify(initial, null,

2)); } catch (e) {} }
function read(p, initial) { ensure(p, initial); try { return JSON.parse(fs.readFileSync(resolve(p), 'utf8')); } catch (e)
{ return JSON.parse(JSON.stringify(initial)); } }
function write(p, obj) { try { fs.writeFileSync(resolve(p), JSON.stringify(obj, null, 2)); return true; } catch (e) {
return false; } }
function writable(p) { ensure(p, {}); try { fs.accessSync(resolve(p), fs.constants.W_OK); return true; } catch (e) {
return false; } }
module.exports = { resolve, ensure, read, write, writable };
