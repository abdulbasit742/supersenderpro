'use strict';
/**
 * tests/smoke/configSmoke.js - typed parsing + secret redaction. Sets env BEFORE require.
 * Usage: node tests/smoke/configSmoke.js
 */
process.env.PORT = '8081';
process.env.SALES_PIPELINE_DRY_RUN = 'false';
process.env.CORS_ALLOWED_ORIGINS = 'https://a.com,https://b.com';
process.env.STRIPE_SECRET_KEY = 'sk_secret_value';
const assert = require('assert');
const { config, redactedReport } = require('../../lib/config');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('int parsing (PORT)', () => { assert.strictEqual(config.core.port, 8081); });
t('bool parsing (sales.dryRun=false)', () => { assert.strictEqual(config.sales.dryRun, false); });
t('csv parsing (cors origins)', () => { assert.deepStrictEqual(config.security.corsOrigins, ['https://a.com', 'https://b.com']); });
t('default applied when unset (billing currency)', () => { assert.strictEqual(config.billing.currency, 'PKR'); });
t('report redacts secret values', () => { const r = redactedReport(); assert.strictEqual(r.billing.stripeKey, '(set)'); assert.notStrictEqual(JSON.stringify(r).indexOf('sk_secret_value'), JSON.stringify(r).indexOf('sk_secret_value') > -1 ? -2 : -1); assert.ok(!JSON.stringify(r).includes('sk_secret_value')); });
t('report keeps non-secret values', () => { const r = redactedReport(); assert.strictEqual(r.core.port, 8081); });

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
