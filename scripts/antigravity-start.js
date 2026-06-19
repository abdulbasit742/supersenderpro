const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ANSI escape codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}     SuperSender Pro - Antigravity Startup        ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

// 1. Run Syntax Check on server.js
console.log(`${BOLD}${BLUE}[1/3] Running Syntax Check on server.js...${RESET}`);
try {
  execSync('node --check server.js', { cwd: ROOT, stdio: 'pipe' });
  console.log(`${GREEN}✔ Syntax check passed! No syntax errors found in server.js.${RESET}\n`);
} catch (error) {
  console.error(`${RED}✘ Syntax check failed! server.js has compilation or syntax errors:${RESET}`);
  console.error(error.stderr ? error.stderr.toString() : error.message);
  process.exit(1);
}

// 2. Run Environment setup validator
console.log(`${BOLD}${BLUE}[2/3] Running Environment Setup Validator...${RESET}`);
try {
  execSync('node scripts/env-validator.js', { cwd: ROOT, stdio: 'inherit' });
  console.log(`${GREEN}✔ Environment check completed successfully!${RESET}\n`);
} catch (error) {
  console.error(`${RED}✘ Environment check failed with critical errors!${RESET}`);
  console.error(`Please fix your .env file or copy from .env.example before running the server.`);
  process.exit(1);
}

// 3. Start the server and monitor output to open QR page
console.log(`${BOLD}${BLUE}[3/3] Starting server.js and listening...${RESET}`);

// Create a copy of the environment or use current process.env
const env = { ...process.env };
// Ensure the port is read, default to 3001
const PORT = env.PORT || 3001;
const QR_URL = `http://localhost:${PORT}/wa-qr`;

const child = spawn('node', ['server.js'], { cwd: ROOT, env });

let qrOpened = false;

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Once server says it's listening or ready, open QR page
  if (!qrOpened && (output.toLowerCase().includes('listening') || output.toLowerCase().includes('running') || output.toLowerCase().includes('http://'))) {
    qrOpened = true;
    console.log(`\n${BOLD}${GREEN}✔ Server is up and running!${RESET}`);
    console.log(`Attempting to open the WhatsApp QR page automatically: ${BOLD}${CYAN}${QR_URL}${RESET}\n`);
    
    // Cross-platform open URL
    const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    try {
      execSync(`${openCommand} "${QR_URL}"`);
    } catch (err) {
      console.log(`${YELLOW}⚠ Could not automatically open browser, please open this link manually to scan QR:${RESET}`);
      console.log(`  ${BOLD}${CYAN}${QR_URL}${RESET}\n`);
    }
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`\n${BOLD}${RED}✘ Server process exited with code ${code}${RESET}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${BOLD}${YELLOW}Stopping server...${RESET}`);
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n${BOLD}${YELLOW}Stopping server...${RESET}`);
  child.kill('SIGTERM');
  process.exit(0);
});
