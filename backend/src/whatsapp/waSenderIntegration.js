const fs = require('fs');
const env = require('../config/env');
const { sendWhatsAppMessage } = require('./baileysClient');

function hasWaSender() {
  return Boolean(env.waSenderApiUrl && env.waSenderApiKey && typeof fetch === 'function');
}

async function waSenderRequest(path, body) {
  const url = `${String(env.waSenderApiUrl).replace(/\/+$/, '')}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.waSenderApiKey}`
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  if (!response.ok) throw new Error(`WA Sender ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reportBroadcastSummary(summary) {
  const message = [
    '📣 Broadcast Summary',
    `Provider: ${summary.provider}`,
    `Sent: ${summary.sent.length}`,
    `Failed: ${summary.failed.length}`,
    summary.failed.length ? `Failures: ${summary.failed.map((row) => `${row.groupId}: ${row.error}`).join(' | ')}` : 'All groups delivered.'
  ].join('\n');
  await prismaAlert(message).catch(() => null);
  if (env.adminNumber) {
    await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, sessionKey: env.adminSessionId, message }).catch((error) => {
      console.error('[waSender:broadcastSummaryWhatsApp]', error);
    });
  }
}

async function prismaAlert(message) {
  const prisma = require('../services/prisma');
  await prisma.adminAlert.create({
    data: {
      type: 'broadcast_summary',
      title: 'Broadcast summary',
      message,
      severity: 'info',
      payload: {}
    }
  });
}

async function broadcastToGroups(message, groups = [], options = {}) {
  const groupIds = groups.map((group) => typeof group === 'string' ? group : group.waGroupId || group.id).filter(Boolean);
  if (!groupIds.length) return { sent: [], failed: [], provider: 'none' };
  const sent = [];
  const failed = [];
  const delayMs = Number(options.delayMs || 2000);
  let provider = hasWaSender() ? 'wa-sender' : 'baileys';

  for (const groupId of groupIds) {
    try {
      if (hasWaSender()) {
        try {
          await waSenderRequest('/broadcast/groups', {
            message,
            groups: [groupId],
            campaignName: options.campaignName || `AI Tools Rates ${new Date().toISOString().slice(0, 10)}`
          });
        } catch (error) {
          console.error('[waSender:broadcastFallback]', groupId, error);
          provider = 'baileys';
          await sendWhatsAppMessage({ to: groupId, message, sessionKey: options.sessionKey || env.customerSessionId });
        }
      } else {
        await sendWhatsAppMessage({ to: groupId, message, sessionKey: options.sessionKey || env.customerSessionId });
      }
      console.log(`[broadcast] sent ${groupId}`);
      sent.push(groupId);
    } catch (error) {
      console.error('[broadcast] failed', groupId, error);
      failed.push({ groupId, error: error.message });
    }
    await delay(delayMs);
  }
  const summary = { sent, failed, provider };
  await reportBroadcastSummary(summary);
  return summary;
}

async function sendPersonal(number, message, options = {}) {
  const to = String(number).includes('@') ? String(number) : `${String(number).replace(/\D/g, '')}@s.whatsapp.net`;
  return sendWhatsAppMessage({ to, message, sessionKey: options.sessionKey || env.customerSessionId });
}

async function sendMedia(number, mediaPath, caption = '', options = {}) {
  const to = String(number).includes('@') ? String(number) : `${String(number).replace(/\D/g, '')}@s.whatsapp.net`;
  if (!/^https?:\/\//i.test(String(mediaPath)) && !fs.existsSync(mediaPath)) {
    throw new Error(`mediaPath not found: ${mediaPath}`);
  }
  return sendWhatsAppMessage({ to, message: caption, mediaUrl: mediaPath, sessionKey: options.sessionKey || env.customerSessionId });
}

module.exports = {
  hasWaSender,
  broadcastToGroups,
  sendPersonal,
  sendMedia
};
