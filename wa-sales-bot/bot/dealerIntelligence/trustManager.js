const { db } = require('../../db/database');
const queries = require('../../db/queries');

function nowIso() {
  return new Date().toISOString();
}

function toJson(value) {
  return JSON.stringify(value || {});
}

function fromJson(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function normalizeNumber(value = '') {
  return queries.normalizeNumber(value);
}

function normalizeToolsList(value = []) {
  const list = Array.isArray(value) ? value : String(value || '').split(',').map(item => item.trim());
  return [...new Set(list.filter(Boolean))];
}

function generateNextDealerCode() {
  const row = db.prepare(`
    SELECT dealer_code
    FROM trusted_dealers
    WHERE dealer_code LIKE 'D-%'
    ORDER BY dealer_code DESC
    LIMIT 1
  `).get();
  const last = Number(String(row?.dealer_code || 'D-000').split('-')[1] || 0);
  return `D-${String(last + 1).padStart(3, '0')}`;
}

function getTrustedDealerByNumber(number = '') {
  return db.prepare('SELECT * FROM trusted_dealers WHERE dealer_number = ?').get(normalizeNumber(number));
}

function getTrustedDealerByCode(code = '') {
  return db.prepare('SELECT * FROM trusted_dealers WHERE dealer_code = ?').get(String(code || '').trim().toUpperCase());
}

function getPendingTrustForDealer(number = '', groupId = '') {
  return db.prepare(`
    SELECT *
    FROM trust_pending
    WHERE dealer_number = ? AND status = 'pending' AND (? = '' OR group_id = ?)
    ORDER BY first_seen DESC
    LIMIT 1
  `).get(normalizeNumber(number), groupId || '', groupId || '');
}

function getLatestPendingTrustForGroup(groupId = '') {
  return db.prepare(`
    SELECT *
    FROM trust_pending
    WHERE group_id = ? AND status = 'pending'
    ORDER BY first_seen DESC
    LIMIT 1
  `).get(groupId);
}

function listPendingTrust() {
  return db.prepare(`
    SELECT *
    FROM trust_pending
    WHERE status = 'pending'
    ORDER BY first_seen DESC
  `).all();
}

function updateTrustedDealerStats(dealerNumber = '') {
  const normalized = normalizeNumber(dealerNumber);
  const trusted = getTrustedDealerByNumber(normalized);
  if (!trusted) return null;

  const rateStats = db.prepare(`
    SELECT AVG(buy_price) AS avg_price, MIN(buy_price) AS lowest_price, MAX(created_at) AS last_active
    FROM dealer_rates
    WHERE dealer_number = ? AND trust_status IN ('trusted', 'manual_trusted')
  `).get(normalized);

  const toolRows = db.prepare(`
    SELECT DISTINCT tool_slug
    FROM dealer_rates
    WHERE dealer_number = ? AND trust_status IN ('trusted', 'manual_trusted')
    ORDER BY tool_slug ASC
  `).all(normalized);

  const yesVotes = Number(trusted.yes_votes || 0);
  const noVotes = Number(trusted.no_votes || 0);
  const totalVotes = Math.max(yesVotes + noVotes, 1);
  const maxOrdersRow = db.prepare('SELECT MAX(orders_completed) AS max_orders FROM trusted_dealers').get();
  const maxOrders = Math.max(Number(maxOrdersRow?.max_orders || 0), 1);
  const accuracyScore = Number(trusted.accuracy_score || 80);
  const yes = yesVotes / totalVotes;
  const orders = Number(trusted.orders_completed || 0) / maxOrders;
  const accuracy = accuracyScore / 100;
  const trustScore =
    (yes * 50) +
    (orders * 30) +
    (accuracy * 20);

  db.prepare(`
    UPDATE trusted_dealers
    SET tools_list = ?,
        avg_price = ?,
        lowest_price = ?,
        last_active = ?,
        trust_score = ?
    WHERE dealer_number = ?
  `).run(
    JSON.stringify(toolRows.map(row => row.tool_slug)),
    Number(rateStats?.avg_price || 0),
    Number(rateStats?.lowest_price || 0),
    rateStats?.last_active || trusted.last_active || nowIso(),
    Number(trustScore.toFixed(2)),
    normalized
  );

  return getTrustedDealerByNumber(normalized);
}

function addTrustedDealer({ dealerNumber, dealerName = '', toolsList = [], manual = false, yesVotes = 3, noVotes = 0 }) {
  const normalized = normalizeNumber(dealerNumber);
  if (!normalized) throw new Error('Dealer number required');
  const existing = getTrustedDealerByNumber(normalized);
  if (existing) {
    const existingTools = normalizeToolsList(fromJson(existing.tools_list));
    db.prepare(`
      UPDATE trusted_dealers
      SET dealer_name = COALESCE(NULLIF(?, ''), dealer_name),
          tools_list = ?,
          yes_votes = ?,
          no_votes = ?
      WHERE dealer_number = ?
    `).run(
      dealerName || '',
      JSON.stringify(normalizeToolsList([...existingTools, ...normalizeToolsList(toolsList)])),
      Math.max(Number(existing.yes_votes || 0), Number(yesVotes || 0)),
      Math.max(Number(existing.no_votes || 0), Number(noVotes || 0)),
      normalized
    );
    return updateTrustedDealerStats(normalized);
  }

  const dealerCode = generateNextDealerCode();
  db.prepare(`
    INSERT INTO trusted_dealers (
      dealer_number, dealer_name, dealer_code, tools_list, avg_price, lowest_price, trust_score,
      yes_votes, no_votes, orders_completed, accuracy_score, added_date, last_active, notes, tags
    )
    VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, 0, 80, ?, ?, ?, ?)
  `).run(
    normalized,
    dealerName || '',
    dealerCode,
    JSON.stringify(normalizeToolsList(toolsList)),
    manual ? 85 : 60,
    Number(yesVotes || 0),
    Number(noVotes || 0),
    nowIso(),
    nowIso(),
    manual ? 'Manually trusted by admin' : 'Trusted by group vote',
    JSON.stringify([])
  );

  db.prepare(`
    UPDATE dealer_rates
    SET trust_status = ?, dealer_code = ?
    WHERE dealer_number = ? AND trust_status = 'pending'
  `).run(manual ? 'manual_trusted' : 'trusted', dealerCode, normalized);

  db.prepare(`
    UPDATE trust_pending
    SET status = ?
    WHERE dealer_number = ? AND status = 'pending'
  `).run(manual ? 'manual_trusted' : 'trusted', normalized);

  return updateTrustedDealerStats(normalized);
}

function removeTrustedDealer(number = '') {
  const normalized = normalizeNumber(number);
  const trusted = getTrustedDealerByNumber(normalized);
  if (!trusted) return false;
  db.prepare('DELETE FROM trusted_dealers WHERE dealer_number = ?').run(normalized);
  db.prepare(`
    UPDATE dealer_rates
    SET trust_status = 'removed', dealer_code = NULL
    WHERE dealer_number = ?
  `).run(normalized);
  return true;
}

function flagScammer(number = '', reason = 'Suspected scammer', evidenceMessage = '') {
  const normalized = normalizeNumber(number);
  if (!normalized) throw new Error('Number required');
  db.prepare(`
    INSERT INTO scammers (number, reason, evidence_message, flagged_date, added_date)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(number) DO UPDATE SET
      reason = excluded.reason,
      evidence_message = excluded.evidence_message,
      flagged_date = excluded.flagged_date,
      added_date = excluded.added_date
  `).run(normalized, reason, evidenceMessage || '', nowIso(), nowIso());
  db.prepare(`
    UPDATE trust_pending
    SET status = 'suspected_scammer'
    WHERE dealer_number = ? AND status = 'pending'
  `).run(normalized);
  db.prepare(`
    UPDATE dealer_rates
    SET trust_status = 'scammer'
    WHERE dealer_number = ? AND trust_status = 'pending'
  `).run(normalized);
  db.prepare(`
    DELETE FROM trusted_dealers WHERE dealer_number = ?
  `).run(normalized);
  queries.flagScammer(normalized, reason);
  return true;
}

function queueTrustPending({ dealerNumber, dealerName = '', toolsMentioned = [], groupId = '', groupName = '', messageText = '' }) {
  const normalized = normalizeNumber(dealerNumber);
  const existing = getPendingTrustForDealer(normalized, groupId);
  const mergedTools = normalizeToolsList([
    ...(existing ? normalizeToolsList(fromJson(existing.tools_mentioned)) : []),
    ...normalizeToolsList(toolsMentioned)
  ]);

  if (existing) {
    db.prepare(`
      UPDATE trust_pending
      SET dealer_name = COALESCE(NULLIF(?, ''), dealer_name),
          tools_mentioned = ?,
          evidence_message = COALESCE(NULLIF(?, ''), evidence_message)
      WHERE id = ?
    `).run(dealerName || '', JSON.stringify(mergedTools), messageText || '', existing.id);
    return db.prepare('SELECT * FROM trust_pending WHERE id = ?').get(existing.id);
  }

  const result = db.prepare(`
    INSERT INTO trust_pending (
      dealer_number, dealer_name, tools_mentioned, first_seen, yes_votes, no_votes, voters_json, status, group_id, group_name, evidence_message
    )
    VALUES (?, ?, ?, ?, 0, 0, ?, 'pending', ?, ?, ?)
  `).run(
    normalized,
    dealerName || '',
    JSON.stringify(mergedTools),
    nowIso(),
    JSON.stringify({}),
    groupId || '',
    groupName || '',
    messageText || ''
  );
  return db.prepare('SELECT * FROM trust_pending WHERE id = ?').get(result.lastInsertRowid);
}

function resolveTargetPending(groupId = '', dealerNumber = '') {
  if (dealerNumber) {
    return getPendingTrustForDealer(dealerNumber, groupId) || getPendingTrustForDealer(dealerNumber, '');
  }
  return getLatestPendingTrustForGroup(groupId);
}

function recordTrustVote({ groupId = '', dealerNumber = '', voterNumber = '', vote = 'yes' }) {
  const pending = resolveTargetPending(groupId, dealerNumber);
  if (!pending) {
    return { ok: false, reason: 'No pending dealer found' };
  }
  const normalizedVoter = normalizeNumber(voterNumber);
  if (!normalizedVoter || normalizedVoter === normalizeNumber(pending.dealer_number)) {
    return { ok: false, reason: 'Invalid voter' };
  }
  const voters = fromJson(pending.voters_json);
  if (voters[normalizedVoter]) {
    return { ok: false, reason: 'Vote already recorded', pending };
  }

  const normalizedVote = String(vote || '').toLowerCase().startsWith('n') ? 'no' : 'yes';
  voters[normalizedVoter] = normalizedVote;
  const yesVotes = Number(pending.yes_votes || 0) + (normalizedVote === 'yes' ? 1 : 0);
  const noVotes = Number(pending.no_votes || 0) + (normalizedVote === 'no' ? 1 : 0);
  let status = 'pending';
  let trustedDealer = null;

  if (yesVotes >= 3) {
    status = 'trusted';
  } else if (noVotes >= 3) {
    status = 'suspected_scammer';
  }

  db.prepare(`
    UPDATE trust_pending
    SET yes_votes = ?, no_votes = ?, voters_json = ?, status = ?
    WHERE id = ?
  `).run(yesVotes, noVotes, JSON.stringify(voters), status, pending.id);

  if (status === 'trusted') {
    trustedDealer = addTrustedDealer({
      dealerNumber: pending.dealer_number,
      dealerName: pending.dealer_name || '',
      toolsList: fromJson(pending.tools_mentioned),
      manual: false,
      yesVotes,
      noVotes
    });
  } else if (status === 'suspected_scammer') {
    flagScammer(pending.dealer_number, 'Group trust vote rejected dealer', pending.evidence_message || '');
  }

  return {
    ok: true,
    pending: db.prepare('SELECT * FROM trust_pending WHERE id = ?').get(pending.id),
    status,
    trustedDealer
  };
}

function markTrustedDealerOrder(dealerCode = '') {
  if (!dealerCode) return null;
  db.prepare(`
    UPDATE trusted_dealers
    SET orders_completed = orders_completed + 1
    WHERE dealer_code = ?
  `).run(String(dealerCode).trim().toUpperCase());
  const dealer = getTrustedDealerByCode(dealerCode);
  if (!dealer) return null;
  return updateTrustedDealerStats(dealer.dealer_number);
}

function getDealerTrustProfile(codeOrNumber = '') {
  const value = String(codeOrNumber || '').trim();
  const trusted = /^D-\d+$/i.test(value)
    ? getTrustedDealerByCode(value)
    : getTrustedDealerByNumber(value);
  if (!trusted) return null;

  const rateRows = db.prepare(`
    SELECT tool_slug, plan_slug, plan_name, MIN(buy_price) AS lowest_price, MAX(buy_price) AS highest_price, AVG(buy_price) AS avg_price
    FROM dealer_rates
    WHERE dealer_number = ? AND trust_status IN ('trusted', 'manual_trusted')
    GROUP BY tool_slug, plan_slug, plan_name
    ORDER BY tool_slug ASC, plan_name ASC
  `).all(trusted.dealer_number);

  return {
    ...trusted,
    tools_list: normalizeToolsList(fromJson(trusted.tools_list)),
    avg_price_per_tool: Object.fromEntries(rateRows.map(row => [`${row.tool_slug}:${row.plan_slug || row.plan_name}`, Number(Number(row.avg_price || 0).toFixed(2))])),
    lowest_price_ever: Object.fromEntries(rateRows.map(row => [`${row.tool_slug}:${row.plan_slug || row.plan_name}`, Number(row.lowest_price || 0)])),
    highest_price_ever: Object.fromEntries(rateRows.map(row => [`${row.tool_slug}:${row.plan_slug || row.plan_name}`, Number(row.highest_price || 0)]))
  };
}

function listTopTrustedDealers(limit = 10) {
  return db.prepare(`
    SELECT *
    FROM trusted_dealers
    ORDER BY trust_score DESC, orders_completed DESC, avg_price ASC
    LIMIT ?
  `).all(Math.max(1, Number(limit || 10))).map(row => ({
    ...row,
    tools_list: normalizeToolsList(fromJson(row.tools_list))
  }));
}

module.exports = {
  normalizeNumber,
  generateNextDealerCode,
  getTrustedDealerByNumber,
  getTrustedDealerByCode,
  getPendingTrustForDealer,
  getLatestPendingTrustForGroup,
  listPendingTrust,
  updateTrustedDealerStats,
  addTrustedDealer,
  removeTrustedDealer,
  flagScammer,
  queueTrustPending,
  recordTrustVote,
  markTrustedDealerOrder,
  getDealerTrustProfile,
  listTopTrustedDealers
};
