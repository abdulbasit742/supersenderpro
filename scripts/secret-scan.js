#!/usr/bin/env node
/**
 * SuperSender Pro - Pre-Push Secret & Safety Scanner
 * Scans git-staged files for secrets and unsafe artifacts before they reach GitHub.
 * Run manually, or wire as a git pre-push / pre-commit hook.
 *
 * Usage:
 *   node scripts/secret-scan.js            # scan staged files (exit 1 if risky)
 *   node scripts/secret-scan.js --all      # scan all tracked files
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

const scanAll = process.argv.includes('--all');

// Safe files that ARE meant to be committed (whitelist — checked first)
const ALLOWED_PATHS = [
  /(^|\/)\.env\.(example|sample|template)$/i,
];

// Files/paths that must NEVER be committed
const FORBIDDEN_PATHS = [
  /(^|\/)\.env$/, /(^|\/)\.env\.local$/, /(^|\/)\.env\.production$/,
  /\.baileys-auth\//, /\.wa-auth\//,
  /(^|\/)auth_info[^/]*\//, /(^|\/)creds\.json$/,
  /private-backup-encrypted\//,
  /\.pem$/, /\.key$/, /(^|\/)id_rsa/,
];

// Secret-looking content patterns
const SECRET_PATTERNS = [
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic API key assignment', re: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i },
  { name: 'Bearer token', re: /bearer\s+[A-Za-z0-9_\-\.]{20,}/i },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: 'Google service account private key', re: /"private_key"\s*:\s*"-----BEGIN/ },
  { name: 'Slack token', re: /xox[baprs]-[0-9A-Za-z\-]{10,}/ },
  { name: 'JWT-like literal', re: /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/ },
];

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}   SuperSender Pro - Pre-Push Secret Scanner      ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

let files = [];
try {
  const cmd = scanAll
    ? 'git ls-files'
    : 'git diff --cached --name-only --diff-filter=ACM';
  files = execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
} catch (e) {
  console.error(`${RED}✘ Could not read git file list: ${e.message}${RESET}`);
  process.exit(1);
}

if (!files.length) {
  console.log(`${YELLOW}No ${scanAll ? 'tracked' : 'staged'} files to scan.${RESET}`);
  console.log(scanAll ? '' : `${YELLOW}Tip: 'git add' your files first, or use --all.${RESET}\n`);
  process.exit(0);
}

const problems = [];

// 1. Forbidden path check (skip explicitly allowed files)
for (const f of files) {
  if (ALLOWED_PATHS.some(re => re.test(f))) continue;
  if (FORBIDDEN_PATHS.some(re => re.test(f))) {
    problems.push({ file: f, issue: 'Forbidden file should never be committed' });
  }
}

// 2. Content secret scan
const TEXT_EXT = /\.(js|ts|tsx|jsx|json|env|md|txt|yml|yaml|sh|ps1|conf|cfg|ini)$/i;
for (const f of files) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
  if (!TEXT_EXT.test(f) && f !== '.env') continue;
  let content;
  try { content = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  if (content.length > 2_000_000) continue; // skip huge files
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const p of SECRET_PATTERNS) {
      if (p.re.test(line)) {
        // ignore obvious placeholders
        if (/example|placeholder|your[_-]?|change[_-]?this|xxxx|\*\*\*\*/i.test(line)) continue;
        problems.push({ file: f, issue: `${p.name} at line ${idx + 1}` });
      }
    }
  });
}

console.log(`Scanned ${BOLD}${files.length}${RESET} ${scanAll ? 'tracked' : 'staged'} file(s).\n`);

if (!problems.length) {
  console.log(`${BOLD}${GREEN}✔ No secrets or forbidden files detected. Safe to push.${RESET}\n`);
  process.exit(0);
}

console.log(`${BOLD}${RED}✘ ${problems.length} potential issue(s) found:${RESET}`);
problems.forEach(p => console.log(`  ${RED}•${RESET} ${BOLD}${p.file}${RESET} — ${p.issue}`));
console.log(`\n${YELLOW}Remove these from the commit (or .gitignore them) before pushing.${RESET}`);
console.log(`${YELLOW}If a match is a false positive, add 'example'/'placeholder' context or unstage the file.${RESET}\n`);
process.exit(1);
