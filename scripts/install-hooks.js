#!/usr/bin/env node
/**
 * SuperSender Pro - Git Hooks Installer
 * Installs a pre-push hook that runs the secret scanner so secrets/.env/
 * session files can never be pushed by accident.
 * Run once: node scripts/install-hooks.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RESET = '\x1b[0m', BOLD = '\x1b[1m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', CYAN = '\x1b[36m';

let gitDir;
try {
  gitDir = execSync('git rev-parse --git-dir', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  console.error(`${RED}✘ Not a git repository. Run this inside the repo.${RESET}`);
  process.exit(1);
}
const hooksDir = path.isAbsolute(gitDir) ? path.join(gitDir, 'hooks') : path.join(ROOT, gitDir, 'hooks');
fs.mkdirSync(hooksDir, { recursive: true });

const hookBody = `#!/bin/sh
# SuperSender Pro pre-push hook — blocks secrets/.env/session leaks
echo "[pre-push] Running secret scan..."
node scripts/secret-scan.js --all
if [ $? -ne 0 ]; then
  echo "[pre-push] BLOCKED: potential secrets detected. Fix them before pushing."
  exit 1
fi
echo "[pre-push] OK — no secrets detected."
exit 0
`;

const hookPath = path.join(hooksDir, 'pre-push');
fs.writeFileSync(hookPath, hookBody, { mode: 0o755 });
try { fs.chmodSync(hookPath, 0o755); } catch {}

console.log(`${BOLD}${GREEN}✔ Installed pre-push hook${RESET} at ${CYAN}${path.relative(ROOT, hookPath)}${RESET}`);
console.log(`${YELLOW}From now on, "git push" will scan for secrets first and block unsafe pushes.${RESET}`);
console.log(`To remove it later: delete ${path.relative(ROOT, hookPath)}`);
