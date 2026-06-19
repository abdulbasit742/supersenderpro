const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');

// ANSI escape codes for beautiful output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}   SuperSender Pro - Environment Setup Validator   ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

// 1. Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log(`${BOLD}${RED}[FAIL] .env file not found!${RESET}`);
  console.log(`Please copy .env.example to .env and fill in your secrets:`);
  console.log(`  ${BOLD}cp .env.example .env${RESET}\n`);
  process.exit(1);
}

// 2. Parse .env
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
envRaw.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
});

// 3. Parse .env.example (to find missing keys)
let envExampleKeys = [];
if (fs.existsSync(envExamplePath)) {
  const exampleRaw = fs.readFileSync(envExamplePath, 'utf8');
  exampleRaw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    envExampleKeys.push(key);
  });
}

let criticalFailures = 0;
let warnings = 0;
let checksPassed = 0;

function reportCheck(type, name, ok, detail) {
  if (ok) {
    checksPassed++;
    console.log(`${GREEN}✔ [OK]${RESET} ${name}${detail ? ` - ${detail}` : ''}`);
  } else {
    if (type === 'fail') {
      criticalFailures++;
      console.log(`${RED}✘ [FAIL]${RESET} ${BOLD}${RED}${name}${RESET}${detail ? ` - ${detail}` : ''}`);
    } else {
      warnings++;
      console.log(`${YELLOW}⚠ [WARN]${RESET} ${YELLOW}${name}${RESET}${detail ? ` - ${detail}` : ''}`);
    }
  }
}

console.log(`${BOLD}${BLUE}--- Core Database & Security Configuration ---${RESET}`);

// Check Database Password
const dbPass = env['DB_PASSWORD'];
reportCheck(
  'fail',
  'DB_PASSWORD check',
  dbPass && dbPass !== 'strongpassword',
  dbPass === 'strongpassword' ? 'Database password is still set to default insecure "strongpassword"' : 'Custom database password set'
);

// Check JWT Secret
const jwtSecret = env['JWT_SECRET'];
reportCheck(
  'fail',
  'JWT_SECRET check',
  jwtSecret && jwtSecret !== 'randomstring_change_this',
  jwtSecret === 'randomstring_change_this' ? 'JWT secret is still set to default insecure "randomstring_change_this"' : 'Custom JWT secret set'
);

// Check Session Secret
const sessionSecret = env['SESSION_SECRET'];
reportCheck(
  'fail',
  'SESSION_SECRET check',
  sessionSecret && sessionSecret !== 'replace_with_a_strong_random_session_secret',
  sessionSecret === 'replace_with_a_strong_random_session_secret' ? 'Session secret is still set to default insecure "replace_with_a_strong_random_session_secret"' : 'Custom session secret set'
);

// Check Encryption Key
const encKey = env['ENCRYPTION_KEY'];
let encKeyOk = encKey && encKey !== 'change_this_32_byte_secret';
let encKeyDetail = 'Custom encryption key set';
if (!encKey) {
  encKeyOk = false;
  encKeyDetail = 'Encryption key is missing';
} else if (encKey === 'change_this_32_byte_secret') {
  encKeyOk = false;
  encKeyDetail = 'Encryption key is still set to default insecure "change_this_32_byte_secret"';
} else if (encKey.length < 16) {
  encKeyOk = false;
  encKeyDetail = 'Encryption key is too short (should be at least 16 or 32 characters)';
}
reportCheck('fail', 'ENCRYPTION_KEY check', encKeyOk, encKeyDetail);

// Check Admin Password
const adminPass = env['ADMIN_PASSWORD'];
reportCheck(
  'warn',
  'ADMIN_PASSWORD safety',
  !adminPass || adminPass !== 'admin12345',
  adminPass === 'admin12345' ? 'Admin dashboard password is still the default "admin12345"' : 'Custom admin password set'
);

console.log(`\n${BOLD}${BLUE}--- Admin Alert Numbers ---${RESET}`);

// Check Admin Number
const adminNum = env['ADMIN_NUMBER'];
let adminNumOk = adminNum && adminNum !== '923001234567';
let adminNumDetail = 'Custom admin phone number set';
if (!adminNum) {
  adminNumOk = false;
  adminNumDetail = 'ADMIN_NUMBER is missing';
} else if (adminNum === '923001234567') {
  adminNumOk = false;
  adminNumDetail = 'ADMIN_NUMBER is still the default "923001234567"';
} else if (!/^\d+$/.test(adminNum)) {
  adminNumOk = false;
  adminNumDetail = 'ADMIN_NUMBER should contain digits only (start with country code, e.g. 92300xxxxxxx, no "+" or leading zeros)';
}
reportCheck('warn', 'ADMIN_NUMBER verification', adminNumOk, adminNumDetail);

console.log(`\n${BOLD}${BLUE}--- Social Bridges & Messaging Configuration ---${RESET}`);

// Check Telegram Token
const tgBotToken = env['TELEGRAM_BOT_TOKEN'] || env['TELEGRAM_TOKEN'];
const tgChatId = env['TELEGRAM_CHAT_ID'] || env['TELEGRAM_CHANNEL_CHAT_ID'];
const tgOk = tgBotToken && tgChatId;
reportCheck(
  'warn',
  'Telegram Social Bridge',
  tgOk,
  !tgBotToken ? 'TELEGRAM_BOT_TOKEN is empty. Telegram posting will be disabled.' : (!tgChatId ? 'TELEGRAM_CHAT_ID is empty. Telegram channel posting is disabled.' : 'Active')
);

// Check Facebook Page Token
const fbToken = env['FB_PAGE_ACCESS_TOKEN'];
const fbPageId = env['FACEBOOK_PAGE_ID'];
const fbOk = fbToken && fbPageId;
reportCheck(
  'warn',
  'Facebook Social Bridge',
  fbOk,
  !fbToken ? 'FB_PAGE_ACCESS_TOKEN is empty. Facebook posting will be disabled.' : (!fbPageId ? 'FACEBOOK_PAGE_ID is empty. Facebook publishing is disabled.' : 'Active')
);

// Check Instagram Page Token
const igToken = env['INSTAGRAM_ACCESS_TOKEN'];
const igUserId = env['INSTAGRAM_IG_USER_ID'];
const igOk = igToken && igUserId;
reportCheck(
  'warn',
  'Instagram Social Bridge',
  igOk,
  !igToken ? 'INSTAGRAM_ACCESS_TOKEN is empty. Instagram posting will be disabled.' : (!igUserId ? 'INSTAGRAM_IG_USER_ID is empty. Instagram publishing is disabled.' : 'Active')
);

console.log(`\n${BOLD}${BLUE}--- AI Web Research & Crawlers ---${RESET}`);

// Check Tavily Key
const tavilyKey = env['TAVILY_API_KEY'];
reportCheck(
  'warn',
  'Tavily Web Research Integration',
  tavilyKey && tavilyKey.trim().length > 0,
  tavilyKey ? 'Active' : 'TAVILY_API_KEY is empty. Web research and automated news fetches are disabled.'
);

// Check Firecrawl Key
const firecrawlKey = env['FIRECRAWL_API_KEY'];
reportCheck(
  'warn',
  'Firecrawl Web Scraping Integration',
  firecrawlKey && firecrawlKey.trim().length > 0,
  firecrawlKey ? 'Active' : 'FIRECRAWL_API_KEY is empty. Direct web page crawling/extraction will be disabled.'
);

console.log(`\n${BOLD}${BLUE}--- Missing .env Keys Comparison ---${RESET}`);
// List missing keys compared to .env.example
const missingKeys = envExampleKeys.filter(key => env[key] === undefined);
if (missingKeys.length > 0) {
  warnings += missingKeys.length;
  console.log(`${YELLOW}⚠ [WARN]${RESET} There are ${missingKeys.length} keys from .env.example missing in your .env file:`);
  missingKeys.forEach(k => console.log(`  - ${k}`));
} else {
  checksPassed++;
  console.log(`${GREEN}✔ [OK]${RESET} All keys from .env.example are present in your .env file.`);
}

console.log(`\n${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}                 Validation Summary               ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`Passed Checks:     ${GREEN}${checksPassed}${RESET}`);
console.log(`Warnings (Non-P0): ${warnings > 0 ? YELLOW : GREEN}${warnings}${RESET}`);
console.log(`Critical Failures: ${criticalFailures > 0 ? RED : GREEN}${criticalFailures}${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

if (criticalFailures > 0) {
  console.log(`${BOLD}${RED}✘ Environment is NOT ready for production/launch! Please resolve the critical failures listed above.${RESET}\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`${BOLD}${YELLOW}⚠ Environment is functional but has warnings. You can run, but some integrations/security features are limited.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${BOLD}${GREEN}✔ Environment is fully configured, secure, and ready for production launch!${RESET}\n`);
  process.exit(0);
}
