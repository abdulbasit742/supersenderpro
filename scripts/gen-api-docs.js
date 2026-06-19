#!/usr/bin/env node
/**
 * SuperSender Pro - API Reference Generator
 * Scans server.js for Express routes and writes a grouped Markdown reference
 * to docs/API_REFERENCE.md. Run: node scripts/gen-api-docs.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');
const OUT = path.join(ROOT, 'docs', 'API_REFERENCE.md');

const RESET = '\x1b[0m', BOLD = '\x1b[1m', GREEN = '\x1b[32m', CYAN = '\x1b[36m', RED = '\x1b[31m';

if (!fs.existsSync(SERVER)) {
  console.error(`${RED}✘ server.js not found.${RESET}`);
  process.exit(1);
}

const src = fs.readFileSync(SERVER, 'utf8');
const re = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/gi;
const routes = [];
let m;
while ((m = re.exec(src)) !== null) routes.push([m[1].toUpperCase(), m[2]]);

const groups = {};
for (const [method, p] of routes) {
  const mm = p.match(/^\/api\/([^/]+)/);
  const key = mm ? mm[1] : '(non-/api)';
  (groups[key] = groups[key] || []).push([method, p]);
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const keys = Object.keys(groups).sort();
const today = new Date().toISOString().slice(0, 10);

let out = [];
out.push('# SuperSender Pro — API Reference (auto-generated)', '');
out.push(`> Auto-extracted from \`server.js\` on ${today}.`);
out.push(`> **${routes.length} routes** across **${keys.length} groups**. Regenerate with \`npm run docs:api\`.`, '');
out.push('## Contents');
for (const k of keys) out.push(`- [\`/api/${k}\`](#api${slug(k)}) (${groups[k].length})`);
out.push('');
for (const k of keys) {
  out.push(`## /api/${k}`, '', '| Method | Endpoint |', '|---|---|');
  const seen = new Set();
  groups[k].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  for (const [method, p] of groups[k]) {
    const sig = `${method} ${p}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(`| \`${method}\` | \`${p}\` |`);
  }
  out.push('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n'), 'utf8');
console.log(`${BOLD}${GREEN}✔ Wrote ${path.relative(ROOT, OUT)}${RESET}`);
console.log(`  ${CYAN}${routes.length}${RESET} routes, ${CYAN}${keys.length}${RESET} groups.`);
