#!/usr/bin/env node
/**
 * SuperSender Pro - Secure Secret Generator
 * Generates cryptographically-strong values for the security-critical
 * .env keys flagged by scripts/env-validator.js and writes them in place.
 *
 * Usage:
 *   node scripts/generate-secrets.js            # update .env in place (creates it from .env.example if missing)
 *   node scripts/generate-secrets.js --print    # only print generated values, do NOT touch .env
 *   node scripts/generate-secrets.js --force     # overwrite even non-default existing secrets
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

const args = process.argv.slice(2);
const printOnly = args.includes('--print');
const force = args.includes('--force');

// Default insecure placeholder values that MUST be replaced
const INSECURE_DEFAULTS = {
  DB_PASSWORD: 'strongpassword',
  JWT_SECRET: 'randomstring_change_this',
  SESSION_SECRET: 'replace_with_a_strong_random_session_secret',
  ENCRYPTION_KEY: 'change_this_32_byte_secret',
  ADMIN_PASSWORD: 'admin12345'
};

// Generators per key
function genHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}
function genBase64(bytes) {
  return crypto.randomBytes(bytes).toString('base64').replace(/[+/=]/g, '').slice(0, Math.ceil(bytes * 1.3));
}

const generated = {
  DB_PASSWORD: genBase64(18),
  JWT_SECRET: genHex(48),
  SESSION_SECRET: genHex(48),
  ENCRYPTION_KEY: genHex(16), // 32 hex chars = 32-byte-style secret
  ADMIN_PASSWORD: genBase64(12)
};

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}   SuperSender Pro - Secure Secret Generator      ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

if (printOnly) {
  console.log(`${YELLOW}Print-only mode. The .env file will NOT be modified.${RESET}\n`);
  Object.entries(generated).forEach(([k, v]) => {
    console.log(`${BOLD}${k}${RESET}=${GREEN}${v}${RESET}`);
  });
  console.log(`\n${CYAN}Copy these into your .env file manually, or run without --print to apply them.${RESET}\n`);
  process.exit(0);
}

// Ensure .env exists (seed from .env.example)
if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log(`${YELLOW}.env did not exist. Seeded a new one from .env.example.${RESET}`);
  } else {
    fs.writeFileSync(envPath, '', 'utf8');
    console.log(`${YELLOW}.env did not exist. Created an empty .env file.${RESET}`);
  }
}

// Backup existing .env before editing
const backupPath = `${envPath}.backup_${Date.now()}`;
fs.copyFileSync(envPath, backupPath);
console.log(`${BLUE}Backup of current .env saved to: ${backupPath}${RESET}\n`);

let lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const seen = new Set();
let updatedCount = 0;
let skippedCount = 0;

lines = lines.map(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return line;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return line;
  const key = trimmed.slice(0, eq).trim();
  if (!(key in generated)) return line;

  seen.add(key);
  const currentVal = trimmed.slice(eq + 1).trim();
  const isInsecure = !currentVal || currentVal === INSECURE_DEFAULTS[key];

  if (isInsecure || force) {
    updatedCount++;
    console.log(`${GREEN}✔ Updated${RESET} ${key}`);
    return `${key}=${generated[key]}`;
  } else {
    skippedCount++;
    console.log(`${YELLOW}- Skipped${RESET} ${key} (already customized; use --force to overwrite)`);
    return line;
  }
});

// Append any generated keys that were missing entirely
Object.keys(generated).forEach(key => {
  if (!seen.has(key)) {
    lines.push(`${key}=${generated[key]}`);
    updatedCount++;
    console.log(`${GREEN}✔ Added${RESET} ${key} (was missing)`);
  }
});

fs.writeFileSync(envPath, lines.join('\n'), 'utf8');

console.log(`\n${BOLD}${CYAN}==================================================${RESET}`);
console.log(`Updated: ${GREEN}${updatedCount}${RESET}   Skipped: ${YELLOW}${skippedCount}${RESET}`);
console.log(`${BOLD}${GREEN}✔ Secrets written to .env. Run "npm run validate:env" to confirm.${RESET}`);
console.log(`${YELLOW}Keep these secret. Never commit your .env to GitHub.${RESET}\n`);
