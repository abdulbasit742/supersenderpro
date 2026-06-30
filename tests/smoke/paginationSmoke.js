'use strict';
/**
 * tests/smoke/paginationSmoke.js - pagination + sorting + query parsing. Usage: node tests/smoke/paginationSmoke.js
 */
const assert = require('assert');
const { parseListQuery, paginate } = require('../../lib/http/pagination');

const rows = Array.from({ length: 125 }, (_, i) => ({ id: i + 1, name: 'r' + (i + 1), at: new Date(2026, 0, 1 + i).toISOString() }));

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('default page size + totals', () => {
  const r = paginate(rows, { page: 1, limit: 50 });
  assert.strictEqual(r.data.length, 50);
  assert.strictEqual(r.total, 125);
  assert.strictEqual(r.totalPages, 3);
  assert.strictEqual(r.hasMore, true);
});
t('last page has remainder + hasMore false', () => {
  const r = paginate(rows, { page: 3, limit: 50 });
  assert.strictEqual(r.data.length, 25);
  assert.strictEqual(r.hasMore, false);
});
t('sort asc by id', () => {
  const r = paginate(rows, { page: 1, limit: 3, sortBy: 'id', order: 'asc' });
  assert.deepStrictEqual(r.data.map((x) => x.id), [1, 2, 3]);
});
t('sort desc by id', () => {
  const r = paginate(rows, { page: 1, limit: 3, sortBy: 'id', order: 'desc' });
  assert.deepStrictEqual(r.data.map((x) => x.id), [125, 124, 123]);
});
t('parseListQuery clamps limit to MAX', () => {
  const q = parseListQuery({ query: { limit: '99999' } });
  assert.ok(q.limit <= 200);
});
t('parseListQuery defaults page=1', () => {
  const q = parseListQuery({ query: {} });
  assert.strictEqual(q.page, 1);
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
