'use strict';
/**
 * lib/http/pagination.js - consistent pagination + sorting for list endpoints.
 * List routes (deals, customers, invoices, audit) currently return whole arrays; for a busy
 * tenant that's a multi-MB response. This gives every list a uniform, bounded shape.
 *
 * parseListQuery(req) -> { page, limit, sortBy, order, offset }
 * paginate(rows, { page, limit, sortBy, order }) -> { data, page, limit, total, totalPages, hasMore }
 */
const DEFAULT_LIMIT = Number(process.env.LIST_DEFAULT_LIMIT || 50);
const MAX_LIMIT = Number(process.env.LIST_MAX_LIMIT || 200);

function parseListQuery(req) {
  const q = (req && req.query) || {};
  let page = parseInt(q.page, 10); if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = parseInt(q.limit, 10); if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const sortBy = q.sortBy || q.sort || null;
  const order = String(q.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { page, limit, sortBy, order, offset: (page - 1) * limit };
}

function sortRows(rows, sortBy, order) {
  if (!sortBy) return rows;
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a ? a[sortBy] : undefined; const bv = b ? b[sortBy] : undefined;
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    // date-aware: ISO strings + Date sort correctly as strings/numbers
    return av > bv ? dir : -dir;
  });
}

function paginate(rows, opts = {}) {
  const all = Array.isArray(rows) ? rows : [];
  const { page = 1, limit = DEFAULT_LIMIT, sortBy = null, order = 'desc' } = opts;
  const sorted = sortRows(all, sortBy, order);
  const total = sorted.length;
  const start = (page - 1) * limit;
  const data = sorted.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { data, page, limit, total, totalPages, hasMore: page < totalPages };
}

// Convenience: parse + paginate in one call from a request.
function paginateRequest(req, rows) { return paginate(rows, parseListQuery(req)); }

module.exports = { parseListQuery, paginate, paginateRequest, DEFAULT_LIMIT, MAX_LIMIT };
