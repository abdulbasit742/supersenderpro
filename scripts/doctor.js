#!/usr/bin/env node
/**
 * SuperSender Pro - Doctor (all-in-one diagnostics)
 * Runs the full pre-flight suite in sequence and prints a single verdict:
 *   1) server.js syntax check
 *   2) environment validator
 *   3) secret scan (all tracked files)
 *   4) system status snapshot
 * Run: node scripts/doctor.js
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RESET = '\x1b[0m', BOLD = '\x1b[1m', GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';

function run(label, cmd, { fatal = false } = {}) {
  process.stdout.write(`\n${BOLD}${CYAN}▶ ${label}${RESET}\n`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch (e) {
    console.log(`${RED}✘ ${label} reported problems.${RESET}`);
    if (fatal) { console.log(`${RED}Stopping — this is a fatal check.${RESET}`); process.exit(1); }
    return false;
  }
}

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}          SuperSender Pro - Doctor                ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}`);

const results = {};
results.syntax = run('1/4 server.js syntax check', 'node --check server.js', { fatal: true });
results.env = run('2/4 environment validator', 'node scripts/env-validator.js');
results.secrets = run('3/4 secret scan', 'node scripts/secret-scan.js --all');
results.status = run('4/4 system status', 'node scripts/status.js');

console.log(`\n${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}Doctor Summary${RESET}`);
const mark = ok => ok ? `${GREEN}PASS${RESET}` : `${YELLOW}WARN${RESET}`;
console.log(`  Syntax:   ${mark(results.syntax)}`);
console.log(`  Env:      ${mark(results.env)}`);
console.log(`  Secrets:  ${mark(results.secrets)}`);
console.log(`  Status:   ${mark(results.status)}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

// Only secrets + syntax are hard gates for a safe push
if (!results.secrets) {
  console.log(`${RED}✘ Secret scan failed — do NOT push until resolved.${RESET}\n`);
  process.exit(1);
}
console.log(`${GREEN}✔ Safe to push. (Warnings above are non-blocking — usually missing live credentials.)${RESET}\n`);
