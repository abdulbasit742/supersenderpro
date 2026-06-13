const { db } = require('../../db/database');
const trustManager = require('./trustManager');
const { parseDealerRates } = require('./dealerParser');
const n8nBridge = require('../../lib/n8nBridge');

function getMessageText(msg) {
  const body = msg.message || {};
  return (
    body.conversation ||
    body.extendedTextMessage?.text ||
    body.imageMessage?.caption ||
    body.videoMessage?.caption ||
    body.documentMessage?.caption ||
    body.buttonsResponseMessage?.selectedButtonId ||
    body.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  ).trim();
}

function getSenderNumber(msg) {
  const raw = msg.key?.participant || msg.key?.remoteJid || '';
  return trustManager.normalizeNumber(String(raw).split('@')[0]);
}

function extractMentionedNumber(text = '') {
  const digits = String(text || '')
    .replace(/[^\d]/g, ' ')
    .trim()
    .split(/\s+/)
    .find(item => item.length >= 10);
  return digits ? trustManager.normalizeNumber(digits) : '';
}

function parseTrustVote(text = '') {
  const match = String(text || '').trim().match(/\btrusted\s+(yes|no)\b/i);
  if (!match) return null;
  return match[1].toLowerCase() === 'no' ? 'no' : 'yes';
}

function saveParsedRates({ dealerNumber, dealerName, dealerCode = '', groupId, groupName, messageText, parsedRows = [], trustStatus = 'trusted' }) {
  const stmt = db.prepare(`
    INSERT INTO dealer_rates (
      dealer_number, dealer_name, dealer_code, tool_slug, plan_name, plan_slug,
      buy_price, date, group_id, group_name, message_text, raw_message, parsed_at, trust_status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, date('now', 'localtime'), ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
  `);
  parsedRows.forEach(row => {
    stmt.run(
      dealerNumber,
      dealerName || '',
      dealerCode || '',
      row.toolSlug,
      row.planName,
      row.planSlug,
      Number(row.price || 0),
      groupId || '',
      groupName || '',
      messageText || '',
      row.rawSegment || messageText || '',
      trustStatus
    );
  });
}

async function notifyAdmin(runtime, text) {
  const adminJid = runtime.adminJid();
  if (!adminJid || !text) return;
  try {
    await runtime.sendText(adminJid, text);
  } catch {}
}

async function sendVotePrompt(sock, groupId, dealerNumber, toolsMentioned = []) {
  const mentionJid = `${dealerNumber}@s.whatsapp.net`;
  const text = `@${dealerNumber} ne rates bheji hain. Kya yeh trusted hai?\nTools: ${toolsMentioned.join(', ') || 'AI tools'}\nReply: *TRUSTED YES* ya *TRUSTED NO*`;
  await sock.sendMessage(groupId, {
    text,
    mentions: [mentionJid]
  });
}

async function handleTrustVoteMessage(runtime, sock, msg, groupId, groupName) {
  const text = getMessageText(msg);
  const vote = parseTrustVote(text);
  if (!vote) return false;

  const voterNumber = getSenderNumber(msg);
  const dealerNumber = extractMentionedNumber(text);
  const result = trustManager.recordTrustVote({
    groupId,
    dealerNumber,
    voterNumber,
    vote
  });

  if (!result.ok) return false;

  const pending = result.pending;
  if (result.status === 'trusted' && result.trustedDealer) {
    const reply = `Dealer trusted ho gaya.\nCode: *${result.trustedDealer.dealer_code}*\nName: ${result.trustedDealer.dealer_name || pending.dealer_name || pending.dealer_number}\nTrust score: ${Number(result.trustedDealer.trust_score || 0).toFixed(2)}`;
    await sock.sendMessage(groupId, { text: reply });
    await notifyAdmin(runtime, `Dealer trusted\nDealer: ${pending.dealer_number}\nCode: ${result.trustedDealer.dealer_code}\nGroup: ${groupName}`);
  } else if (result.status === 'suspected_scammer') {
    const reply = `Dealer suspicious mark ho gaya.\nNumber: *${pending.dealer_number}*\nYES votes: ${pending.yes_votes}\nNO votes: ${pending.no_votes}`;
    await sock.sendMessage(groupId, { text: reply });
    await notifyAdmin(runtime, `Dealer flagged by group\nDealer: ${pending.dealer_number}\nGroup: ${groupName}\nEvidence: ${pending.evidence_message || 'Vote rejection'}`);
  } else {
    await sock.sendMessage(groupId, {
      text: `Vote recorded for ${pending.dealer_number}\nYES: ${pending.yes_votes}\nNO: ${pending.no_votes}`
    });
  }
  return true;
}

function triggerRateToN8n(payload = {}, meta = {}) {
  n8nBridge.triggerDealerRateCollected(payload, meta).catch(() => {});
}

async function processSellingGroupMessage(runtime, sock, msg, groupId, groupName) {
  if (await handleTrustVoteMessage(runtime, sock, msg, groupId, groupName)) {
    return { handled: true, type: 'trust_vote' };
  }

  const text = getMessageText(msg);
  const dealerNumber = getSenderNumber(msg);
  const dealerName = msg.pushName || '';
  const parsedRows = parseDealerRates(text, dealerNumber);

  if (!parsedRows.length) {
    return { handled: false, type: 'ignored' };
  }

  const trusted = trustManager.getTrustedDealerByNumber(dealerNumber);
  if (trusted && trusted.dealer_code) {
    saveParsedRates({
      dealerNumber,
      dealerName: dealerName || trusted.dealer_name || '',
      dealerCode: trusted.dealer_code,
      groupId,
      groupName,
      messageText: text,
      parsedRows,
      trustStatus: 'trusted'
    });
    trustManager.updateTrustedDealerStats(dealerNumber);
    triggerRateToN8n({
      dealerNumber,
      dealerName: dealerName || trusted.dealer_name || '',
      dealerCode: trusted.dealer_code,
      groupId,
      groupName,
      trustStatus: 'trusted',
      messageText: text,
      parsedRows
    }, {
      channel: 'selling_group',
      stage: 'trusted_rate_saved'
    });
    return { handled: true, type: 'trusted_rate', rows: parsedRows };
  }

  if (db.prepare('SELECT id FROM scammers WHERE number = ?').get(dealerNumber)) {
    saveParsedRates({
      dealerNumber,
      dealerName,
      groupId,
      groupName,
      messageText: text,
      parsedRows,
      trustStatus: 'scammer'
    });
    return { handled: true, type: 'scammer_ignored', rows: parsedRows };
  }

  saveParsedRates({
    dealerNumber,
    dealerName,
    groupId,
    groupName,
    messageText: text,
    parsedRows,
    trustStatus: 'pending'
  });

  const pending = trustManager.queueTrustPending({
    dealerNumber,
    dealerName,
    toolsMentioned: [...new Set(parsedRows.map(row => `${row.toolSlug}:${row.planSlug}`))],
    groupId,
    groupName,
    messageText: text
  });

  await sendVotePrompt(sock, groupId, dealerNumber, parsedRows.map(row => `${row.toolName} ${row.planName}`));
  await notifyAdmin(
    runtime,
    `Unverified dealer posted rates\nNumber: ${dealerNumber}\nName: ${dealerName || 'Unknown'}\nGroup: ${groupName}\nTools: ${parsedRows.map(row => `${row.toolName} ${row.planName} = Rs ${row.price}`).join('\n')}\nPending ID: ${pending.id}`
  );

  triggerRateToN8n({
    dealerNumber,
    dealerName,
    groupId,
    groupName,
    trustStatus: 'pending',
    pendingId: pending.id,
    messageText: text,
    parsedRows
  }, {
    channel: 'selling_group',
    stage: 'pending_trust_vote'
  });

  return { handled: true, type: 'pending_rate', rows: parsedRows, pending };
}

module.exports = {
  getMessageText,
  getSenderNumber,
  handleTrustVoteMessage,
  processSellingGroupMessage
};
