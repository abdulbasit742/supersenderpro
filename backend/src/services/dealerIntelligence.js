const prisma = require('./prisma');
const { parseDealerMessage } = require('../dealerIntelligence/dealerParser');
const { normalizePhone } = require('../utils/phone');
const { slugify } = require('../config/catalog');

async function nextDealerCode() {
  const count = await prisma.trustedDealer.count();
  return `D-${String(count + 1).padStart(3, '0')}`;
}

async function trustScore({ yesVotes = 0, noVotes = 0, ordersCompleted = 0, accuracyScore = 80 }) {
  const total = Number(yesVotes) + Number(noVotes);
  const voteScore = total ? (Number(yesVotes) / total) * 50 : 25;
  const maxOrders = Math.max(ordersCompleted, 10);
  const orderScore = (Number(ordersCompleted) / maxOrders) * 30;
  return Math.min(100, Math.max(0, voteScore + orderScore + (Number(accuracyScore || 0) / 100) * 20));
}

async function getDealerStatus(number) {
  const dealerNumber = normalizePhone(number);
  const [scammer, trusted] = await Promise.all([
    prisma.scammer.findUnique({ where: { number: dealerNumber } }).catch(() => null),
    prisma.trustedDealer.findUnique({ where: { dealerNumber } }).catch(() => null)
  ]);
  if (scammer) return { status: 'scammer', scammer };
  if (trusted) return { status: 'trusted', trusted };
  return { status: 'unverified' };
}

async function ensureTrustPending({ dealerNumber, dealerName, toolsMentioned, groupId, groupName, evidenceMessage }) {
  const normalized = normalizePhone(dealerNumber);
  const existing = await prisma.trustPending.findFirst({ where: { dealerNumber: normalized, status: 'pending' } });
  if (existing) return existing;
  return prisma.trustPending.create({
    data: {
      dealerNumber: normalized,
      dealerName,
      toolsMentioned,
      groupId,
      groupName,
      evidenceMessage,
      voters: []
    }
  });
}

async function addTrustedDealer({ dealerNumber, dealerName = '', toolsList = [], yesVotes = 3, noVotes = 0, manual = false }) {
  const normalized = normalizePhone(dealerNumber);
  const existing = await prisma.trustedDealer.findUnique({ where: { dealerNumber: normalized } }).catch(() => null);
  const score = await trustScore({ yesVotes, noVotes, ordersCompleted: 0, accuracyScore: manual ? 90 : 80 });
  if (existing) {
    return prisma.trustedDealer.update({
      where: { dealerNumber: normalized },
      data: { dealerName: dealerName || existing.dealerName, toolsList, yesVotes, noVotes, trustScore: score, lastActive: new Date() }
    });
  }
  return prisma.trustedDealer.create({
    data: {
      dealerNumber: normalized,
      dealerName: dealerName || normalized,
      dealerCode: await nextDealerCode(),
      toolsList,
      yesVotes,
      noVotes,
      trustScore: score,
      accuracyScore: manual ? 90 : 80,
      lastActive: new Date()
    }
  });
}

async function castTrustVote({ dealerNumber, voterNumber, vote }) {
  const normalizedDealer = normalizePhone(dealerNumber);
  const normalizedVoter = normalizePhone(voterNumber);
  const pending = await prisma.trustPending.findFirst({ where: { dealerNumber: normalizedDealer, status: 'pending' } });
  if (!pending) throw new Error('Pending trust verification not found');
  const voters = Array.isArray(pending.voters) ? pending.voters : [];
  if (voters.some((row) => row.voter === normalizedVoter)) return pending;
  const yes = /^yes|trusted$/i.test(String(vote || ''));
  const updatedVoters = [...voters, { voter: normalizedVoter, vote: yes ? 'yes' : 'no', at: new Date().toISOString() }];
  const nextYes = pending.yesVotes + (yes ? 1 : 0);
  const nextNo = pending.noVotes + (yes ? 0 : 1);
  let status = 'pending';
  if (nextYes >= 3) status = 'trusted';
  if (nextNo >= 3) status = 'suspected_scammer';
  const updated = await prisma.trustPending.update({
    where: { id: pending.id },
    data: { yesVotes: nextYes, noVotes: nextNo, voters: updatedVoters, status }
  });
  if (status === 'trusted') {
    await addTrustedDealer({ dealerNumber: normalizedDealer, dealerName: pending.dealerName || '', toolsList: pending.toolsMentioned || [], yesVotes: nextYes, noVotes: nextNo });
  }
  if (status === 'suspected_scammer') {
    await prisma.scammer.upsert({
      where: { number: normalizedDealer },
      update: { reason: 'Group trust vote rejected dealer', evidenceMessage: pending.evidenceMessage || '' },
      create: { number: normalizedDealer, reason: 'Group trust vote rejected dealer', evidenceMessage: pending.evidenceMessage || '' }
    });
  }
  return updated;
}

async function processDealerMessage({ dealerNumber, dealerName = '', groupId = '', groupName = '', messageText = '' }) {
  const parsed = parseDealerMessage(messageText);
  if (!parsed.length) return { parsed: [], saved: [], status: 'ignored' };
  const dealerStatus = await getDealerStatus(dealerNumber);
  if (dealerStatus.status === 'scammer') return { parsed, saved: [], status: 'scammer_ignored' };
  const saved = [];
  const normalized = normalizePhone(dealerNumber);
  const toolsMentioned = [...new Set(parsed.map((row) => slugify(row.toolName || row.tool || row.toolSlug)))];
  if (dealerStatus.status === 'unverified') {
    await ensureTrustPending({ dealerNumber: normalized, dealerName, toolsMentioned, groupId, groupName, evidenceMessage: messageText });
  }
  for (const row of parsed) {
    const toolSlug = slugify(row.toolName || row.toolSlug || row.tool || '');
    const planName = row.planName || row.plan || 'Default';
    saved.push(await prisma.dealerRateIntelligence.create({
      data: {
        dealerNumber: normalized,
        dealerName,
        dealerCode: dealerStatus.trusted?.dealerCode || null,
        toolSlug,
        planSlug: slugify(planName),
        planName,
        price: Number(row.buyPrice || row.price),
        groupId,
        groupName,
        messageText,
        trustStatus: dealerStatus.status
      }
    }));
  }
  return { parsed, saved, status: dealerStatus.status };
}

module.exports = {
  processDealerMessage,
  castTrustVote,
  addTrustedDealer,
  getDealerStatus,
  trustScore
};
