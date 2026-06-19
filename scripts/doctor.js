#!/usr/bin/env node
/**
 * SuperSender Pro - Doctor
 * Runs the pre-flight suite with the same Node runtime that launched this file.
 * This avoids Windows PATH issues where plain `node` may be blocked.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NODE = process.execPath;
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function run(label, args, { fatal = false } = {}) {
  process.stdout.write(`\n${BOLD}${CYAN}> ${label}${RESET}\n`);
  try {
    execFileSync(NODE, args, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`${RED}FAIL ${label} reported problems.${RESET}`);
    if (fatal) {
      console.log(`${RED}Stopping because this is a fatal check.${RESET}`);
      process.exit(1);
    }
    return false;
  }
}

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}          SuperSender Pro - Doctor                ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}`);

const results = {};
results.syntax = run('1/4 server.js syntax check', ['--check', 'server.js'], { fatal: true });
results.env = run('2/4 environment validator', ['scripts/env-validator.js']);
results.secrets = run('3/4 secret scan', ['scripts/secret-scan.js', '--all']);
results.status = run('4/4 system status', ['scripts/status.js']);

console.log(`\n${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}Doctor Summary${RESET}`);
const mark = ok => ok ? `${GREEN}PASS${RESET}` : `${YELLOW}WARN${RESET}`;
console.log(`  Syntax:   ${mark(results.syntax)}`);
console.log(`  Env:      ${mark(results.env)}`);
console.log(`  Secrets:  ${mark(results.secrets)}`);
console.log(`  Status:   ${mark(results.status)}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

if (!results.secrets) {
  console.log(`${RED}Secret scan failed. Do not push until resolved.${RESET}\n`);
  process.exit(1);
}

console.log(`${GREEN}Safe to push. Warnings above are usually missing live credentials.${RESET}\n`);
