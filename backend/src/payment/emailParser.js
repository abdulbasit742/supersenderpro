const env = require('../config/env');
const { parseJazzCash } = require('./jazzcash');
const { parseEasyPaisa } = require('./easypaisa');

let ImapFlow = null;
try {
  ({ ImapFlow } = require('imapflow'));
} catch {
  ImapFlow = null;
}

const BANK_SENDERS = /(hbl|ubl|mcb|meezan|bank|alfalah|faysal|standardchartered|samba|askari)/i;
const PAYMENT_SENDERS = [
  /jazzcash@jazz\.com\.pk/i,
  /easypaisa@telenor\.com\.pk/i,
  BANK_SENDERS
];

function parseBank(text = '') {
  const body = String(text || '');
  const txn = body.match(/(?:transaction(?:\s*id)?|txn|trx|reference(?:\s*no)?|ref|rrn|stan)[\s#:.-]*([A-Z0-9-]{5,})/i)?.[1];
  const amount = (
    body.match(/(?:amount|credited|received|paid)[\s:.-]*(?:rs\.?|pkr)?[\s:.-]*([0-9,]+(?:\.\d{1,2})?)/i) ||
    body.match(/(?:rs\.?|pkr)[\s:.-]*([0-9,]+(?:\.\d{1,2})?)/i)
  )?.[1];
  const sender = body.match(/(?:from|sender|mobile|account)[\s:.-]*(\+?92\d{10}|0\d{10}|[0-9*Xx-]{6,})/i)?.[1];
  return txn && amount ? { transactionId: txn, amount: Number(amount.replace(/,/g, '')), senderMobile: sender || '', paymentMethod: 'Bank' } : null;
}

function parsePaymentEmail({ from = '', subject = '', body = '', date = new Date() }) {
  const text = `${from}\n${subject}\n${body}`;
  const parsed = parseJazzCash(text) || parseEasyPaisa(text) || parseBank(text);
  if (!parsed) return null;
  const paidAt = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/)?.[1];
  return {
    ...parsed,
    paidAt: paidAt ? new Date(paidAt) : new Date(date),
    emailFrom: from,
    emailSubject: subject,
    rawSnippet: text.slice(0, 1500)
  };
}

function isPaymentSender(from = '') {
  return PAYMENT_SENDERS.some((pattern) => pattern.test(String(from || '')));
}

async function fetchTextBody(message) {
  if (message.text) return message.text;
  if (message.html) return String(message.html).replace(/<[^>]+>/g, ' ');
  return '';
}

async function checkMailboxOnce(io) {
  if (!env.emailUser || !env.emailPassword || !ImapFlow) {
    return { success: false, skipped: true, reason: 'Email parser is not configured or imapflow is missing' };
  }
  const client = new ImapFlow({
    host: env.emailImapHost,
    port: env.emailImapPort,
    secure: true,
    auth: { user: env.emailUser, pass: env.emailPassword },
    logger: false
  });
  const processed = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true, bodyStructure: true })) {
        const from = msg.envelope?.from?.map((item) => item.address).join(',') || '';
        if (!isPaymentSender(from)) continue;
        const raw = msg.source?.toString('utf8') || '';
        const parsed = parsePaymentEmail({
          from,
          subject: msg.envelope?.subject || '',
          body: await fetchTextBody({ text: raw }),
          date: msg.envelope?.date || new Date()
        });
        if (!parsed) continue;
        const { enqueuePaymentNotification } = require('../queues/paymentQueue');
        const result = await enqueuePaymentNotification(parsed, io);
        io?.emit('payment:parsed', result);
        processed.push(result);
        await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => null);
  }
  return { success: true, processed };
}

function startPaymentEmailWatcher(io) {
  if (!env.emailPaymentParserEnabled) return { started: false, reason: 'EMAIL_PAYMENT_PARSER_ENABLED is not true' };
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await checkMailboxOnce(io);
    } catch (error) {
      console.error('[emailParser:watcher]', error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, env.paymentCheckIntervalMs);
  tick();
  return { started: true, timer };
}

module.exports = {
  parsePaymentEmail,
  checkMailboxOnce,
  startPaymentEmailWatcher,
  isPaymentSender
};
