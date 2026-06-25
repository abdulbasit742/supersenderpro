#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m', bold: '\x1b[1m' };
const log = (color, symbol, msg) => console.log(`${colors[color]}${symbol}${colors.reset} ${msg}`);
const ok   = (msg) => log('green',  '✅', msg);
const warn = (msg) => log('yellow', '⚠️ ', msg);
const err  = (msg) => log('red',    '❌', msg);
const info = (msg) => log('blue',   'ℹ️ ', msg);

console.log(`\n${colors.bold}${colors.blue}🚀 SuperSender Pro — Production Setup${colors.reset}\n`);

// 1. Check Node version
const nodeVersion = parseInt(process.version.slice(1));
if (nodeVersion >= 18) ok(`Node.js ${process.version} (required: >=18)`);
else { err(`Node.js ${process.version} is too old. Please upgrade to v18+`); process.exit(1); }

// 2. Check .env
const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');
if (fs.existsSync(envPath)) {
  ok('.env file exists');
} else if (fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  warn('.env created from .env.example — Please fill in all required values!');
} else {
  err('.env.example not found! Cannot create .env');
}

// 3. Check and fix dangerous default secrets in .env
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  let modified = false;

  const secretsToFix = [
    { key: 'JWT_SECRET',       defaultVal: 'randomstring_change_this' },
    { key: 'ENCRYPTION_KEY',   defaultVal: 'change_this_32_byte_secret' },
    { key: 'SESSION_SECRET',   defaultVal: 'replace_with_a_strong_random_session_secret' },
    { key: 'ADMIN_PASSWORD',   defaultVal: 'admin12345' },
  ];

  for (const { key, defaultVal } of secretsToFix) {
    if (envContent.includes(`${key}=${defaultVal}`)) {
      const newSecret = crypto.randomBytes(32).toString('hex');
      envContent = envContent.replace(`${key}=${defaultVal}`, `${key}=${newSecret}`);
      modified = true;
      warn(`${key} was default — auto-generated new secure value`);
    }
  }

  if (modified) {
    fs.writeFileSync(envPath, envContent);
    ok('Secrets auto-hardened in .env');
  } else {
    ok('Secrets appear to be customized');
  }
}

// 4. Create required directories
const requiredDirs = [
  'data', 'logs', 'uploads', 'exports', 'tmp',
  'social-auto-posts/inbox', 'social-auto-posts/queued', 'social-auto-posts/posted', 'social-auto-posts/failed',
  'video-auto-posts/inbox',  'video-auto-posts/queued',  'video-auto-posts/posted',
  'public/assets/giveaways',
];
for (const dir of requiredDirs) {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    ok(`Created directory: ${dir}`);
  }
}

// 5. Check package.json dependencies
const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const required = ['express', '@whiskeysockets/baileys', 'socket.io', 'axios', 'bcryptjs'];
  for (const dep of required) {
    if (deps[dep]) ok(`Dependency: ${dep} (${deps[dep]})`);
    else warn(`Missing dependency: ${dep} — run npm install`);
  }
}

// 6. Print next steps
console.log(`\n${colors.bold}${colors.blue}📋 Next Steps to Go Live:${colors.reset}`);
const steps = [
  '1. Fill .env with real values (PostgreSQL, Redis, WhatsApp numbers, payment details)',
  '2. Run: docker-compose up -d (starts DB + Redis)',
  '3. Run: cd backend && npx prisma migrate deploy',
  '4. Run: node server.js (starts WhatsApp bot)',
  '5. Scan QR at: http://localhost:3001/api/whatsapp/qr/customer-bot',
  '6. Open dashboard: http://localhost:3000',
  '7. Import n8n workflows from n8n-workflows/ at: http://localhost:5678',
  '8. Run: npm run health (to verify everything is OK)',
];
steps.forEach(s => info(s));
console.log('');
