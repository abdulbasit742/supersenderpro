const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BASE_URL = process.env.LAUNCH_CHECK_BASE_URL || 'http://127.0.0.1:3001';
const checks = [];

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function addCheck(name, ok, detail = '') {
  checks.push({ name, ok: !!ok, detail });
}

function httpGetJson(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: JSON.parse(body || '{}') });
        } catch (error) {
          resolve({ ok: false, status: res.statusCode, error: `Invalid JSON: ${error.message}` });
        }
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('Timeout'));
    });
    req.on('error', error => resolve({ ok: false, error: error.message }));
  });
}

function gitTrackedList(pattern) {
  const { execFileSync } = require('child_process');
  try {
    return execFileSync('git', ['ls-files', pattern], { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  addCheck('server.js exists', exists('server.js'));
  addCheck('package.json exists', exists('package.json'));
  addCheck('MCP stdio server exists', exists('mcp/supersender-mcp.js'));
  addCheck('ChatGPT OpenAPI connector exists', exists('mcp/chatgpt/server.js'));
  addCheck('ChatGPT connector README exists', exists('mcp/chatgpt/README.md'));

  const envExample = exists('.env.example') ? read('.env.example') : '';
  addCheck('.env.example has GPT connector keys', /GPT_CONNECTOR_ENABLED=/.test(envExample) && /GPT_CONNECTOR_API_KEY=/.test(envExample));
  addCheck('.env.example has WhatsApp Cloud API keys', /WHATSAPP_CLOUD_API_ENABLED=/.test(envExample) && /WHATSAPP_CLOUD_ACCESS_TOKEN=/.test(envExample));

  const gitignore = exists('.gitignore') ? read('.gitignore') : '';
  addCheck('.gitignore blocks env files', /\.env/.test(gitignore));
  addCheck('.gitignore blocks auth/session folders', /\.wa-auth/.test(gitignore) && /\.baileys-auth/.test(gitignore));
  addCheck('.gitignore blocks runtime data json', /data\/\*\.json/.test(gitignore));
  addCheck('.gitignore blocks private backup bundle', /private-backup-encrypted\//.test(gitignore));

  addCheck('private backups are not tracked', gitTrackedList('private-backup-encrypted/*').length === 0);
  addCheck('NemoClaw broken gitlink is not tracked', gitTrackedList('NemoClaw').length === 0);

  const health = await httpGetJson(`${BASE_URL}/api/health`);
  addCheck('live server /api/health responds', health.ok, health.error || `HTTP ${health.status}`);

  const gptStatus = await httpGetJson(`${BASE_URL}/api/gpt-connector/status`);
  addCheck('live server GPT connector status route responds', gptStatus.ok && gptStatus.body && gptStatus.body.success === true, gptStatus.error || `HTTP ${gptStatus.status}`);

  const failed = checks.filter(item => !item.ok);
  const passed = checks.length - failed.length;

  console.log('\nSuperSender Pro Launch Readiness');
  console.log('='.repeat(38));
  for (const item of checks) {
    console.log(`${item.ok ? 'OK  ' : 'FAIL'} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
  }
  console.log('='.repeat(38));
  console.log(`Passed: ${passed}/${checks.length}`);

  if (failed.length) {
    console.log('\nLaunch blockers:');
    failed.forEach(item => console.log(`- ${item.name}${item.detail ? `: ${item.detail}` : ''}`));
    process.exitCode = 1;
  } else {
    console.log('\nLaunch gate passed for source, safety, and live API basics.');
  }
}

main().catch(error => {
  console.error(`Launch readiness failed: ${error.message}`);
  process.exitCode = 1;
});
