'use strict';
/**
 * lib/version/index.js - build/version identity so you can confirm what's actually running.
 * Pulls version from package.json and the commit SHA from env (set at build/deploy time:
 * BUILD_SHA / GIT_COMMIT / SOURCE_VERSION) with a best-effort .git/HEAD fallback for local runs.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const BOOT_TIME = new Date().toISOString();

function pkgVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0'; } catch { return '0.0.0'; }
}

function gitSha() {
  const fromEnv = process.env.BUILD_SHA || process.env.GIT_COMMIT || process.env.SOURCE_VERSION || process.env.RENDER_GIT_COMMIT || process.env.RAILWAY_GIT_COMMIT_SHA;
  if (fromEnv) return String(fromEnv).slice(0, 12);
  try {
    const head = fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) { const ref = head.slice(5).trim(); return fs.readFileSync(path.join(ROOT, '.git', ref), 'utf8').trim().slice(0, 12); }
    return head.slice(0, 12);
  } catch { return 'unknown'; }
}

let cached = null;
function info() {
  if (cached) return Object.assign({}, cached, { uptimeSec: Math.round(process.uptime()) });
  cached = {
    name: 'supersender-pro',
    version: pkgVersion(),
    commit: gitSha(),
    env: process.env.NODE_ENV || 'development',
    node: process.version,
    bootedAt: BOOT_TIME,
  };
  return Object.assign({}, cached, { uptimeSec: Math.round(process.uptime()) });
}

module.exports = { info, pkgVersion, gitSha };
