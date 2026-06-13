const prisma = require('../services/prisma');
const { normalizePhone } = require('../utils/phone');
const { parseDealerMessage } = require('./dealerParser');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');

function toolsFromRates(rates = []) {
  return [...new Set(rates.map((row) => row.toolSlug || row.tool).filter(Boolean))];
}

async function generateDealerCode() {
  const rows = await prisma.trustedDealer.findMany({ select: { dealerCode: true } });
  const max = rows.reduce((highest, row) => {
    const n = Number(String(row.dealerCode || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 0);
  return `D-${String(max + 1).padStart(3, '0')}`;
}

function calculateTrustScore({ yesVotes = 0, noVotes = 0, ordersCompleted = 0, accuracyScore = 80 }) {
  const totalVotes = Number(yesVotes) + Number(noVotes);
  const voteScore = totalVotes ? (Number(yesVotes) / totalVotes) * 50 : 25;
  const orderScore = Math.min(30, (Number(ordersCompleted || 0) / 20) * 30);
  const accuracy = Math.min(20, (Number(accuracyScore || 0) / 100) * 20);
  return Number(Math.max(0, Math.min(100, voteScore + orderScore + accuracy)).toFixed(1));
}

async function addToTrusted(dealerNumber, code, details = {}) {
  const normalized = normalizePhone(dealerNumber);
  const dealerCode = code || await generateDealerCode();
  const yesVotes = Number(details.yesVotes ?? 3);
  const noVotes = Number(details.noVotes ?? 0);
  const toolsList = details.toolsList || details.toolsMentioned || [];
  return prisma.trustedDealer.upsert({
    where: { dealerNumber: normalized },
    update: {
      dealerName: details.dealerName || undefined,
      toolsList,
      yesVotes,
      noVotes,
      trustScore: calculateTrustScore({ yesVotes, noVotes, ordersCompleted: details.ordersCompleted, accuracyScore: details.accuracyScore || 85 }),
      lastActive: new Date()
    },
    create: {
      dealerNumber: normalized,
      dealerName: details.dealerName || normalized,
      dealerCode,
      toolsList,
      yesVotes,
      noVotes,
      trustScore: calculateTrustScore({ yesVotes, noVotes, ordersCompleted: details.ordersCompleted, accuracyScore: details.accuracyScore || 85 }),
      accuracyScore: details.accuracyScore || 85,
      lastActive: new Date()
    }
  });
}

async function flagSuspectedScammer(dealerNumber, reason = 'Group trust vote rejected dealer', evidenceMessage = '') {
  const normalized = normalizePhone(dealerNumber);
  return prisma.scammer.upsert({
    where: { number: normalized },
    update: { reason, evidenceMessage },
    create: { number: normalized, reason, evidenceMessage }
  });
}

async function ensurePending(dealerNumber, details = {}) {
  const normalized = normalizePhone(dealerNumber);
  const pending = await prisma.trustPending.findFirst({ where: { dealerNumber: normalized, status: 'pending' } });
  if (pending) return pending;
  return prisma.trustPending.create({
    data: {
      dealerNumber: normalized,
      dealerName: details.dealerName || normalized,
      toolsMentioned: details.toolsMentioned || [],
      groupId: details.groupId || '',
      groupName: details.groupName || '',
      evidenceMessage: details.evidenceMessage || '',
      voters: []
    }
  });
}

async function askGroupForTrust(dealerNumber, groupId, toolsMentioned = [], sessionKey = 'main') {
  const normalized = normalizePhone(dealerNumber);
  const message = [
    '⚠️ نیا dealer rate بھیج رہا ہے',
    `📱 ${normalized}`,
    `Tools: ${toolsMentioned.length ? toolsMentioned.join(', ') : 'AI tools'}`,
    '',
    'کیا یہ trusted ہے؟',
    '✅ TRUSTED YES بھیجیں',
    '❌ TRUSTED NO بھیجیں'
  ].join('\n');
  try {
    if (groupId) await sendWhatsAppMessage({ to: groupId, message, sessionKey });
    return { success: true, message };
  } catch (error) {
    console.error('[trust:askGroupForTrust]', error);
    await prisma.adminAlert.create({
      data: {
        type: 'trust_vote',
        title: `Trust vote needed: ${normalized}`,
        message,
        severity: 'warning',
        payload: { dealerNumber: normalized, groupId, toolsMentioned }
      }
    }).catch(() => null);
    return { success: false, message, error: error.message };
  }
}

async function checkTrustThreshold(dealerNumber) {
  const normalized = normalizePhone(dealerNumber);
  const pending = await prisma.trustPending.findFirst({ where: { dealerNumber: normalized, status: 'pending' } });
  if (!pending) return { status: 'none' };
  if (Number(pending.yesVotes || 0) >= 3) {
    const trusted = await addToTrusted(normalized, null, {
      dealerName: pending.dealerName,
      toolsMentioned: pending.toolsMentioned || [],
      yesVotes: pending.yesVotes,
      noVotes: pending.noVotes
    });
    await prisma.trustPending.update({ where: { id: pending.id }, data: { status: 'trusted' } });
    return { status: 'trusted', trusted };
  }
  if (Number(pending.noVotes || 0) >= 3) {
    const scammer = await flagSuspectedScammer(normalized, '3 group members voted TRUSTED NO', pending.evidenceMessage || '');
    await prisma.trustPending.update({ where: { id: pending.id }, data: { status: 'suspected_scammer' } });
    return { status: 'suspected_scammer', scammer };
  }
  return { status: 'pending', pending };
}

async function recordTrustVote(voter, dealerNumber, vote) {
  try {
    const normalizedDealer = normalizePhone(dealerNumber);
    const normalizedVoter = normalizePhone(voter);
    const pending = await ensurePending(normalizedDealer);
    const voters = Array.isArray(pending.voters) ? pending.voters : [];
    if (voters.some((row) => row.voter === normalizedVoter)) {
      return { ...pending, duplicate: true };
    }
    const yes = /^trusted\s*yes$|^yes$|^trusted$/i.test(String(vote || '').trim());
    const data = {
      yesVotes: Number(pending.yesVotes || 0) + (yes ? 1 : 0),
      noVotes: Number(pending.noVotes || 0) + (yes ? 0 : 1),
      voters: [...voters, { voter: normalizedVoter, vote: yes ? 'YES' : 'NO', at: new Date().toISOString() }]
    };
    const updated = await prisma.trustPending.update({ where: { id: pending.id }, data });
    const threshold = await checkTrustThreshold(normalizedDealer);
    return { ...updated, threshold };
  } catch (error) {
    console.error('[trust:recordTrustVote]', error);
    return { success: false, error: error.message };
  }
}

async function monitorGroupMessage(msg = {}, groupId = '') {
  try {
    const text = msg.text || msg.messageText || msg.body || '';
    const dealerNumber = normalizePhone(msg.dealerNumber || msg.sender || msg.from || '');
    const dealerName = msg.dealerName || msg.pushName || dealerNumber;
    const rates = parseDealerMessage(text);
    if (!dealerNumber || !rates.length) return { status: 'ignored', rates: [] };
    const scammer = await prisma.scammer.findUnique({ where: { number: dealerNumber } }).catch(() => null);
    if (scammer) {
      await prisma.adminAlert.create({
        data: { type: 'scammer_rate_attempt', title: `Scammer ignored: ${dealerNumber}`, message: text, severity: 'danger', payload: { groupId, dealerNumber } }
      }).catch(() => null);
      return { status: 'scammer_ignored', rates };
    }
    const trusted = await prisma.trustedDealer.findUnique({ where: { dealerNumber } }).catch(() => null);
    const toolsMentioned = toolsFromRates(rates);
    if (!trusted) {
      await ensurePending(dealerNumber, { dealerName, toolsMentioned, groupId, groupName: msg.groupName, evidenceMessage: text });
      await askGroupForTrust(dealerNumber, groupId, toolsMentioned, msg.sessionKey || 'main');
    }
    const saved = [];
    for (const rate of rates) {
      saved.push(await prisma.dealerRateIntelligence.create({
        data: {
          dealerNumber,
          dealerName,
          dealerCode: trusted?.dealerCode || null,
          toolSlug: rate.toolSlug,
          planSlug: rate.planSlug,
          planName: rate.planName,
          price: rate.price,
          groupId,
          groupName: msg.groupName || '',
          messageText: text,
          trustStatus: trusted ? 'trusted' : 'unverified'
        }
      }));
    }
    return { status: trusted ? 'trusted' : 'unverified', rates, saved };
  } catch (error) {
    console.error('[trust:monitorGroupMessage]', error);
    return { status: 'error', error: error.message, rates: [] };
  }
}

module.exports = {
  monitorGroupMessage,
  askGroupForTrust,
  recordTrustVote,
  checkTrustThreshold,
  generateDealerCode,
  addToTrusted,
  flagSuspectedScammer,
  calculateTrustScore,
  ensurePending
};
