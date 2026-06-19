const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_LOCAL = 'http://127.0.0.1:3001';
loadLocalEnv();
const localSettings = loadLocalSettings();
const LOCAL_BASE_URL = normalizeBaseUrl(process.env.LAUNCH_CHECK_BASE_URL || DEFAULT_LOCAL);
const PUBLIC_BASE_URL = firstPublicUrl([
  process.env.PUBLIC_LAUNCH_URL,
  process.env.PUBLIC_BASE_URL,
  process.env.SOCIAL_PUBLIC_BASE_URL,
  process.env.GMAIL_PUBLIC_BASE_URL,
  localSettings.public_base_url,
  localSettings.social_public_base_url,
  localSettings.gmail_public_base_url
]);
const TIMEOUT_MS = Math.max(1500, Number(process.env.PUBLIC_LAUNCH_TIMEOUT_MS || 9000));
const checks = [];

function loadLocalEnv() {
  const envPath = require('path').join(__dirname, '..', '.env');
  try {
    if (!require('fs').existsSync(envPath)) return;
    const raw = require('fs').readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    console.warn(`[launch-check] Could not load .env: ${error.message}`);
  }
}

function loadLocalSettings() {
  const settingsPath = require('path').join(__dirname, '..', 'data', 'settings.json');
  try {
    if (!require('fs').existsSync(settingsPath)) return {};
    return JSON.parse(require('fs').readFileSync(settingsPath, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function normalizeBaseUrl(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/\/+$/, '');
}

function isLocalUrl(value = '') {
  try {
    const host = new URL(normalizeBaseUrl(value)).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '::1'].includes(host);
  } catch {
    return false;
  }
}

function firstPublicUrl(values = []) {
  return values.map(normalizeBaseUrl).filter(Boolean).find(value => !isLocalUrl(value)) || '';
}

function addCheck(name, ok, detail = '', severity = 'critical') {
  checks.push({ name, ok: !!ok, detail, severity });
}

function requestJson(url) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      resolve({ ok: false, status: 0, error: error.message });
      return;
    }
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.get(parsed, { timeout: TIMEOUT_MS }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: json
          });
        } catch (error) {
          resolve({ ok: false, status: res.statusCode, error: `Invalid JSON: ${error.message}` });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Timeout')));
    req.on('error', error => resolve({ ok: false, status: 0, error: error.message }));
  });
}

function promiseWithTimeout(promise, timeoutMs = 1500, timeoutMessage = 'Timeout') {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function checkEndpoint(baseUrl, path) {
  return requestJson(`${baseUrl}${path}`);
}

async function main() {
  const localHealth = await checkEndpoint(LOCAL_BASE_URL, '/api/health');
  addCheck('local /api/health responds', localHealth.ok, localHealth.error || `HTTP ${localHealth.status}`);

  const localCompletion = await checkEndpoint(LOCAL_BASE_URL, '/api/project/completion-report');
  addCheck(
    'local completion report responds',
    localCompletion.ok && localCompletion.body && localCompletion.body.success === true,
    localCompletion.error || `HTTP ${localCompletion.status}`
  );

  const localLaunch = await checkEndpoint(LOCAL_BASE_URL, '/api/launch/status');
  addCheck(
    'local public launch status route responds',
    localLaunch.ok && localLaunch.body && localLaunch.body.success === true,
    localLaunch.error || `HTTP ${localLaunch.status}`
  );

  addCheck('public base URL configured', !!PUBLIC_BASE_URL, PUBLIC_BASE_URL || 'Set PUBLIC_BASE_URL or PUBLIC_LAUNCH_URL', 'recommended');

  if (PUBLIC_BASE_URL) {
    let publicDnsOk = false;
    let host = '';
    try {
      host = new URL(PUBLIC_BASE_URL).hostname;
      const resolved = await promiseWithTimeout(dns.lookup(host), 1500, 'DNS lookup timeout');
      publicDnsOk = !!resolved.address;
      addCheck('public domain resolves in DNS', !!resolved.address, `${host} -> ${resolved.address}`);
    } catch (error) {
      addCheck('public domain resolves in DNS', false, error.message);
    }

    if (publicDnsOk) {
      const publicHealth = await checkEndpoint(PUBLIC_BASE_URL, '/api/health');
      addCheck('public /api/health responds', publicHealth.ok, publicHealth.error || `HTTP ${publicHealth.status}`);

      const publicLaunch = await checkEndpoint(PUBLIC_BASE_URL, '/api/launch/status');
      addCheck(
        'public /api/launch/status responds',
        publicLaunch.ok && publicLaunch.body && publicLaunch.body.success === true,
        publicLaunch.error || `HTTP ${publicLaunch.status}`
      );
    } else {
      addCheck('public /api/health responds', false, 'Skipped because DNS did not resolve');
      addCheck('public /api/launch/status responds', false, 'Skipped because DNS did not resolve');
    }
  }

  const failedCritical = checks.filter(item => !item.ok && item.severity === 'critical');
  const failedRecommended = checks.filter(item => !item.ok && item.severity !== 'critical');
  const passed = checks.length - failedCritical.length - failedRecommended.length;

  console.log('\nSuperSender Pro Public Launch Check');
  console.log('='.repeat(40));
  for (const item of checks) {
    const prefix = item.ok ? 'OK  ' : item.severity === 'critical' ? 'FAIL' : 'WARN';
    console.log(`${prefix} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
  }
  console.log('='.repeat(40));
  console.log(`Passed: ${passed}/${checks.length}`);

  if (failedCritical.length) {
    console.log('\nPublic launch blockers:');
    failedCritical.forEach(item => console.log(`- ${item.name}${item.detail ? `: ${item.detail}` : ''}`));
    process.exitCode = 1;
    return;
  }

  if (failedRecommended.length) {
    console.log('\nPublic launch has warnings:');
    failedRecommended.forEach(item => console.log(`- ${item.name}${item.detail ? `: ${item.detail}` : ''}`));
  }
  console.log('\nPublic launch check completed.');
}

main().catch(error => {
  console.error(`Public launch check failed: ${error.message}`);
  process.exitCode = 1;
});
