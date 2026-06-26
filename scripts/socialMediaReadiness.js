#!/usr/bin/env node
/*
 * SuperSender Pro - Social Media Production Readiness Check
 *
 * Usage:
 *   node scripts/socialMediaReadiness.js
 *   node scripts/socialMediaReadiness.js --json
 *   node scripts/socialMediaReadiness.js --markdown
 *   node scripts/socialMediaReadiness.js --fail-on-critical
 *
 * This script is intentionally dependency-free so it can run on local
 * Windows/Linux/VPS installs before real Meta/LinkedIn credentials are live.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ENV_FILE = path.join(ROOT, '.env');
const ENV_EXAMPLE_FILE = path.join(ROOT, '.env.example');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const args = new Set(process.argv.slice(2));
const outputJson = args.has('--json');
const outputMarkdown = args.has('--markdown');
const failOnCritical = args.has('--fail-on-critical');

const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'linkedin'];
const REQUIRED_ENV_KEYS = [
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_PAGE_ID',
  'FB_PAGE_ACCESS_TOKEN',
  'FB_VERIFY_TOKEN',
  'INSTAGRAM_IG_USER_ID',
  'INSTAGRAM_ACCESS_TOKEN',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'LINKEDIN_ACCESS_TOKEN',
  'LINKEDIN_AUTHOR_URN',
  'SOCIAL_PUBLIC_BASE_URL',
  'SOCIAL_AUTO_POST_DIR'
];

const SOCIAL_DIRS = [
  'social-auto-posts',
  'social-auto-posts/inbox',
  'social-auto-posts/queued',
  'social-auto-posts/posted',
  'social-auto-posts/failed',
  'social-auto-posts/media',
  'video-auto-posts',
  'video-auto-posts/inbox',
  'video-auto-posts/generated',
  'video-auto-posts/assets',
  'video-auto-posts/posted',
  'video-auto-posts/failed'
];

const DATA_FILES = [
  'social_accounts.json',
  'social_posts.json',
  'social_events.json',
  'social_auto_posts.json',
  'video_auto_posts.json',
  'video_ai_providers.json'
];

function readEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return { __parseError: error.message };
  }
}

function mask(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function hasUsableValue(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return Boolean(text) && !/^(changeme|replace|todo|null|undefined|your_|example)/i.test(text);
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function addCheck(checks, level, name, passed, details, recommendation) {
  checks.push({
    level,
    name,
    passed: Boolean(passed),
    details: details || '',
    recommendation: recommendation || ''
  });
}

function accountConfigured(account) {
  if (!account || !hasUsableValue(account.accessToken)) return false;
  if (account.platform === 'facebook') return hasUsableValue(account.pageId || account.facebookPageId);
  if (account.platform === 'instagram') return hasUsableValue(account.igUserId || account.instagramIgUserId);
  if (account.platform === 'linkedin') return hasUsableValue(account.authorUrn || account.linkedinAuthorUrn);
  return false;
}

function countByStatus(rows) {
  const counts = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = row.status || row.type || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function buildReport() {
  const env = { ...readEnv(ENV_EXAMPLE_FILE), ...readEnv(ENV_FILE) };
  const envExample = readEnv(ENV_EXAMPLE_FILE);
  const settings = readJSON(SETTINGS_FILE, {});
  const socialAccounts = readJSON(path.join(DATA_DIR, 'social_accounts.json'), []);
  const socialPosts = readJSON(path.join(DATA_DIR, 'social_posts.json'), []);
  const socialEvents = readJSON(path.join(DATA_DIR, 'social_events.json'), []);
  const autoPosts = readJSON(path.join(DATA_DIR, 'social_auto_posts.json'), []);
  const videoPosts = readJSON(path.join(DATA_DIR, 'video_auto_posts.json'), []);
  const videoProviders = readJSON(path.join(DATA_DIR, 'video_ai_providers.json'), []);

  const checks = [];

  addCheck(
    checks,
    'critical',
    '.env or .env.example exists',
    fs.existsSync(ENV_FILE) || fs.existsSync(ENV_EXAMPLE_FILE),
    fs.existsSync(ENV_FILE) ? '.env found' : fs.existsSync(ENV_EXAMPLE_FILE) ? '.env.example found' : 'No env file found',
    'Create .env from .env.example and keep real tokens local only.'
  );

  for (const key of REQUIRED_ENV_KEYS) {
    addCheck(
      checks,
      key.includes('TOKEN') || key.includes('SECRET') ? 'warning' : 'info',
      `Env key declared: ${key}`,
      Object.prototype.hasOwnProperty.call(envExample, key) || Object.prototype.hasOwnProperty.call(env, key),
      hasUsableValue(env[key]) ? `configured (${mask(env[key])})` : 'declared but not configured',
      `Add ${key} to .env when the real platform app is ready.`
    );
  }

  for (const file of DATA_FILES) {
    const value = readJSON(path.join(DATA_DIR, file), []);
    addCheck(
      checks,
      'critical',
      `Data file valid: ${file}`,
      !value.__parseError,
      value.__parseError ? value.__parseError : `${Array.isArray(value) ? value.length : Object.keys(value || {}).length} records`,
      `Run npm run health to create or repair data/${file}.`
    );
  }

  for (const dir of SOCIAL_DIRS) {
    addCheck(
      checks,
      dir.includes('/inbox') ? 'warning' : 'info',
      `Directory exists: ${dir}`,
      fs.existsSync(path.join(ROOT, dir)),
      fs.existsSync(path.join(ROOT, dir)) ? 'found' : 'missing',
      `Create ${dir} or run the existing setup/health scripts.`
    );
  }

  const publicBaseUrl = env.SOCIAL_PUBLIC_BASE_URL || settings.social_public_base_url || settings.SOCIAL_PUBLIC_BASE_URL;
  addCheck(
    checks,
    'critical',
    'Social public base URL is HTTPS',
    isHttpsUrl(publicBaseUrl),
    publicBaseUrl || 'not configured',
    'For Meta/Instagram media publishing, set SOCIAL_PUBLIC_BASE_URL to your public HTTPS domain or tunnel URL.'
  );

  const accounts = Array.isArray(socialAccounts) ? socialAccounts : [];
  for (const platform of SOCIAL_PLATFORMS) {
    const rows = accounts.filter((row) => row.platform === platform);
    const readyRows = rows.filter(accountConfigured);
    addCheck(
      checks,
      'critical',
      `${platform} account ready`,
      readyRows.length > 0,
      `${readyRows.length}/${rows.length} configured`,
      `Use /social dashboard to save a ${platform} account with token and required IDs.`
    );
  }

  const instagramReadyForMedia = accounts.some((row) => row.platform === 'instagram' && accountConfigured(row)) && isHttpsUrl(publicBaseUrl);
  addCheck(
    checks,
    'critical',
    'Instagram media publishing ready',
    instagramReadyForMedia,
    instagramReadyForMedia ? 'IG account + HTTPS media URL ready' : 'Needs IG account and public HTTPS media URL',
    'Connect Instagram Business account and expose /social-auto-media over HTTPS.'
  );

  const videoProviderReady = Array.isArray(videoProviders) && videoProviders.some((provider) => (
    provider.enabled !== false && hasUsableValue(provider.apiUrl) && hasUsableValue(provider.apiKey)
  ));
  addCheck(
    checks,
    'warning',
    'AI video provider ready',
    videoProviderReady,
    `${Array.isArray(videoProviders) ? videoProviders.length : 0} providers saved`,
    'Save Runway/Pika/Luma/Kling or another provider from the Social dashboard before running video generation.'
  );

  const autoPosterEnabled = settings.social_auto_poster_enabled !== false;
  addCheck(
    checks,
    'warning',
    'Social auto-poster enabled',
    autoPosterEnabled,
    `social_auto_poster_enabled=${settings.social_auto_poster_enabled}`,
    'Set social_auto_poster_enabled=true in settings.json or .env for scheduled folder posting.'
  );

  const recentFailures = [
    ...((Array.isArray(socialPosts) ? socialPosts : []).filter((row) => ['failed', 'blocked', 'partial'].includes(row.status))),
    ...((Array.isArray(autoPosts) ? autoPosts : []).filter((row) => ['failed', 'blocked', 'partial'].includes(row.status))),
    ...((Array.isArray(videoPosts) ? videoPosts : []).filter((row) => ['failed', 'blocked', 'partial'].includes(row.status)))
  ].slice(-10);

  addCheck(
    checks,
    'warning',
    'No recent blocked/failed social jobs',
    recentFailures.length === 0,
    `${recentFailures.length} recent blocked/failed/partial jobs detected`,
    'Open /social, inspect Recent Social Posts and retry blocked jobs after adding tokens.'
  );

  const totals = {
    checks: checks.length,
    passed: checks.filter((check) => check.passed).length,
    failed: checks.filter((check) => !check.passed).length,
    criticalFailed: checks.filter((check) => !check.passed && check.level === 'critical').length,
    warningFailed: checks.filter((check) => !check.passed && check.level === 'warning').length
  };

  const score = Math.round((totals.passed / Math.max(1, totals.checks)) * 100);
  const readiness = totals.criticalFailed === 0 && score >= 85 ? 'production-ready' : score >= 65 ? 'staging-ready' : 'needs-work';

  return {
    generatedAt: new Date().toISOString(),
    project: 'SuperSender Pro',
    module: 'Social Media Automation',
    readiness,
    score,
    totals,
    summary: {
      socialAccounts: accounts.length,
      configuredAccounts: accounts.filter(accountConfigured).length,
      postsByStatus: countByStatus(socialPosts),
      autoPosterByStatus: countByStatus(autoPosts),
      videoJobsByStatus: countByStatus(videoPosts),
      eventsByType: countByStatus(socialEvents),
      videoProviders: Array.isArray(videoProviders) ? videoProviders.length : 0,
      publicBaseUrl: publicBaseUrl || ''
    },
    checks,
    nextSteps: checks
      .filter((check) => !check.passed)
      .slice(0, 12)
      .map((check) => ({ name: check.name, level: check.level, recommendation: check.recommendation }))
  };
}

function printText(report) {
  console.log('\nSuperSender Pro — Social Media Production Readiness');
  console.log('='.repeat(60));
  console.log(`Status: ${report.readiness}`);
  console.log(`Score: ${report.score}%`);
  console.log(`Passed: ${report.totals.passed}/${report.totals.checks}`);
  console.log(`Critical failed: ${report.totals.criticalFailed}`);
  console.log(`Warning failed: ${report.totals.warningFailed}`);
  console.log('\nSummary:');
  console.log(`- Social accounts: ${report.summary.configuredAccounts}/${report.summary.socialAccounts} configured`);
  console.log(`- Public media URL: ${report.summary.publicBaseUrl || 'missing'}`);
  console.log(`- Video providers: ${report.summary.videoProviders}`);
  console.log('\nFailed checks:');
  const failed = report.checks.filter((check) => !check.passed);
  if (!failed.length) {
    console.log('- None');
  } else {
    for (const check of failed) {
      console.log(`- [${check.level}] ${check.name}: ${check.details}`);
      if (check.recommendation) console.log(`  Fix: ${check.recommendation}`);
    }
  }
  console.log('\nUseful commands:');
  console.log('- npm run health');
  console.log('- npm run social:check');
  console.log('- npm run social:check -- --json');
  console.log('');
}

function printMarkdown(report) {
  const lines = [
    '# SuperSender Pro — Social Media Production Readiness',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `**Status:** ${report.readiness}`,
    `**Score:** ${report.score}%`,
    `**Passed:** ${report.totals.passed}/${report.totals.checks}`,
    `**Critical failed:** ${report.totals.criticalFailed}`,
    `**Warning failed:** ${report.totals.warningFailed}`,
    '',
    '## Summary',
    '',
    `- Social accounts configured: ${report.summary.configuredAccounts}/${report.summary.socialAccounts}`,
    `- Public media URL: ${report.summary.publicBaseUrl || 'missing'}`,
    `- Video providers: ${report.summary.videoProviders}`,
    '',
    '## Failed Checks',
    ''
  ];

  const failed = report.checks.filter((check) => !check.passed);
  if (!failed.length) {
    lines.push('- None');
  } else {
    for (const check of failed) {
      lines.push(`- **[${check.level}] ${check.name}** — ${check.details}`);
      if (check.recommendation) lines.push(`  - Fix: ${check.recommendation}`);
    }
  }

  console.log(lines.join('\n'));
}

const report = buildReport();

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (outputMarkdown) {
  printMarkdown(report);
} else {
  printText(report);
}

if (failOnCritical && report.totals.criticalFailed > 0) {
  process.exitCode = 1;
}
