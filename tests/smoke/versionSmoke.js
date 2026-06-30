'use strict';
/**
 * tests/smoke/versionSmoke.js - version info is well-formed. Usage: node tests/smoke/versionSmoke.js
 */
const assert = require('assert');
const version = require('../../lib/version');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('info has version + commit + node', () => { const i = version.info(); assert.ok(i.version); assert.ok(i.commit); assert.ok(i.node); });
t('version matches semver-ish', () => { assert.ok(/^\d+\.\d+\.\d+/.test(version.pkgVersion())); });
t('env BUILD_SHA is honored', () => { process.env.BUILD_SHA = 'abcdef1234567890'; assert.strictEqual(version.gitSha(), 'abcdef123456'); });
t('uptime included + numeric', () => { const i = version.info(); assert.strictEqual(typeof i.uptimeSec, 'number'); });

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
