#!/usr/bin/env node
/**
 * SuperSender Pro - System Status Summary
 * One-glance health snapshot of the project from local artifacts:
 *  - Last health check result (health_report.json)
 *  - Live/public tunnel status (live-status.json)
 *  - Git branch + last commit
 *  - Presence of .env and core runtime files
 *
 * Usage: node scripts/status.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const GREY = '\x1b[90m';

function readJson(rel) {
  try {
    let raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip UTF-8 BOM
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function dot(ok) {
  return ok ? `${GREEN}●${RESET}` : `${RED}●${RESET}`;
}

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}        SuperSender Pro - System Status           ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

// --- Core files ---
console.log(`${BOLD}${BLUE}Core Files${RESET}`);
console.log(`  ${dot(exists('server.js'))} server.js`);
console.log(`  ${dot(exists('package.json'))} package.json`);
console.log(`  ${dot(exists('.env'))} .env ${exists('.env') ? '' : `${GREY}(missing — run "npm run generate:secrets")${RESET}`}`);
console.log(`  ${dot(exists('.env.example'))} .env.example`);

// --- Git ---
console.log(`\n${BOLD}${BLUE}Git${RESET}`);
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  const commit = execSync('git log -1 --pretty=%h%x20%s', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  const dirty = execSync('git status --porcelain', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  console.log(`  Branch:      ${CYAN}${branch}${RESET}`);
  console.log(`  Last commit: ${GREY}${commit}${RESET}`);
  console.log(`  Working tree: ${dirty ? `${YELLOW}${dirty.split('\n').length} uncommitted change(s)${RESET}` : `${GREEN}clean${RESET}`}`);
} catch {
  console.log(`  ${YELLOW}Not a git repository (or git unavailable).${RESET}`);
}

// --- Health report ---
console.log(`\n${BOLD}${BLUE}Last Health Check${RESET}  ${GREY}(health_report.json)${RESET}`);
const health = readJson('health_report.json');
if (health) {
  const ok = (health.failed === 0) && health.serverAlive;
  console.log(`  ${dot(ok)} Status:    ${ok ? `${GREEN}HEALTHY${RESET}` : `${RED}ISSUES FOUND${RESET}`}`);
  console.log(`     Passed:   ${GREEN}${health.passed ?? '?'}${RESET}`);
  console.log(`     Fixed:    ${health.fixed ?? 0}`);
  console.log(`     Failed:   ${health.failed > 0 ? RED : GREEN}${health.failed ?? 0}${RESET}`);
  console.log(`     Server:   ${health.serverAlive ? `${GREEN}alive${RESET}` : `${RED}down${RESET}`}`);
  console.log(`     Run at:   ${GREY}${health.timestamp || 'unknown'}${RESET}`);
  if (Array.isArray(health.issues) && health.issues.length) {
    console.log(`     ${RED}Issues:${RESET}`);
    health.issues.slice(0, 10).forEach(i => console.log(`       - ${i}`));
  }
} else {
  console.log(`  ${YELLOW}No health_report.json found. Run "npm run health".${RESET}`);
}

// --- Live status ---
console.log(`\n${BOLD}${BLUE}Live / Tunnel Status${RESET}  ${GREY}(live-status.json)${RESET}`);
const live = readJson('live-status.json');
if (live) {
  if (live.local) {
    console.log(`  ${dot(live.local.ok)} Local:  ${live.local.ok ? `${GREEN}UP${RESET}` : `${RED}DOWN${RESET}`}  ${GREY}${live.local.url || ''}${RESET}`);
  }
  if (live.public) {
    console.log(`  ${dot(live.public.ok)} Public: ${live.public.ok ? `${GREEN}UP${RESET}` : `${RED}DOWN${RESET}`}  ${GREY}${live.public.url || ''}${RESET}`);
    if (!live.public.ok && live.public.error) {
      console.log(`     ${YELLOW}${live.public.error}${RESET}`);
    }
  }
  if (live.nextStep) console.log(`  ${GREY}Next: ${live.nextStep}${RESET}`);
  console.log(`  ${GREY}Generated: ${live.generatedAt || 'unknown'}${RESET}`);
} else {
  console.log(`  ${YELLOW}No live-status.json found. Run scripts/go-live.ps1 to generate one.${RESET}`);
}

console.log(`\n${BOLD}${CYAN}==================================================${RESET}\n`);
