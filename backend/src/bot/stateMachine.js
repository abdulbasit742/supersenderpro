const prisma = require('../services/prisma');

const STATES = {
  IDLE: 'IDLE',
  MENU: 'MENU',
  RATES: 'RATES',
  AVAILABILITY: 'AVAILABILITY',
  TOOL_SELECT: 'TOOL_SELECT',
  TYPE_SELECT: 'TYPE_SELECT',
  POLICY_CONFIRM: 'POLICY_CONFIRM',
  PAYMENT: 'PAYMENT',
  SCREENSHOT: 'SCREENSHOT',
  DELIVERED: 'DELIVERED'
};

const timeoutMs = 30 * 60 * 1000;
const memory = new Map();

const ALLOWED_TRANSITIONS = {
  [STATES.IDLE]: [STATES.IDLE, STATES.MENU, STATES.RATES, STATES.AVAILABILITY, STATES.TOOL_SELECT],
  [STATES.MENU]: [STATES.IDLE, STATES.RATES, STATES.AVAILABILITY, STATES.TOOL_SELECT],
  [STATES.RATES]: [STATES.IDLE, STATES.MENU, STATES.TOOL_SELECT, STATES.TYPE_SELECT, STATES.AVAILABILITY],
  [STATES.AVAILABILITY]: [STATES.IDLE, STATES.MENU, STATES.TOOL_SELECT, STATES.TYPE_SELECT],
  [STATES.TOOL_SELECT]: [STATES.IDLE, STATES.MENU, STATES.TYPE_SELECT, STATES.POLICY_CONFIRM],
  [STATES.TYPE_SELECT]: [STATES.IDLE, STATES.MENU, STATES.POLICY_CONFIRM],
  [STATES.POLICY_CONFIRM]: [STATES.IDLE, STATES.MENU, STATES.PAYMENT],
  [STATES.PAYMENT]: [STATES.IDLE, STATES.MENU, STATES.SCREENSHOT],
  [STATES.SCREENSHOT]: [STATES.IDLE, STATES.MENU, STATES.DELIVERED],
  [STATES.DELIVERED]: [STATES.IDLE, STATES.MENU, STATES.RATES, STATES.AVAILABILITY]
};

function canTransition(fromState, toState) {
  if (!fromState || fromState === toState) return true;
  return (ALLOWED_TRANSITIONS[fromState] || []).includes(toState);
}

async function getConversation(number) {
  const cached = memory.get(number);
  let current = cached;
  if (!current) {
    const persisted = await prisma.conversation.findUnique({ where: { customerNumber: number } }).catch(() => null);
    current = persisted
      ? { number, state: persisted.state, context: persisted.context || {}, updatedAt: persisted.lastUpdated.toISOString() }
      : { number, state: STATES.IDLE, context: {}, updatedAt: new Date(0).toISOString() };
    memory.set(number, current);
  }
  if (Date.now() - new Date(current.updatedAt).getTime() > timeoutMs) {
    return setConversation(number, STATES.IDLE, {}, { reason: 'timeout_30m', force: true });
  }
  return current;
}

async function setConversation(number, state, context = {}, options = {}) {
  const previous = memory.get(number) || { state: STATES.IDLE, context: {} };
  const targetState = STATES[state] || state || STATES.IDLE;
  if (!options.force && !canTransition(previous.state, targetState)) {
    const blocked = {
      number,
      from: previous.state,
      to: targetState,
      at: new Date().toISOString(),
      reason: 'invalid_transition'
    };
    console.warn('[conversation:blocked]', blocked);
    await prisma.adminAlert.create({
      data: {
        type: 'conversation_state_blocked',
        title: `Blocked state ${number}: ${previous.state} -> ${targetState}`,
        message: `Invalid conversation transition blocked for ${number}`,
        severity: 'warning',
        payload: blocked
      }
    }).catch(() => null);
    return previous;
  }
  const row = { number, state: targetState, context, updatedAt: new Date().toISOString() };
  memory.set(number, row);
  await prisma.conversation.upsert({
    where: { customerNumber: number },
    update: { state: targetState, context, lastUpdated: new Date(row.updatedAt) },
    create: { customerNumber: number, state: targetState, context, lastUpdated: new Date(row.updatedAt) }
  }).catch((error) => {
    console.error('[conversation:persist]', error);
  });
  console.log(`[conversation] ${number}: ${previous.state} -> ${targetState}`);
  await prisma.adminAlert.create({
    data: {
      type: 'conversation_state',
      title: `State ${number}: ${previous.state} -> ${targetState}`,
      message: `Conversation state updated from ${previous.state} to ${targetState}`,
      severity: 'info',
      payload: { previous, next: row, reason: options.reason || 'message' }
    }
  }).catch(() => null);
  return row;
}

async function resetConversation(number) {
  return setConversation(number, STATES.IDLE, {}, { reason: 'manual_reset', force: true });
}

function isResetCommand(text = '') {
  return /^(cancel|menu|start|reset|واپس)$/i.test(String(text || '').trim());
}

function isHelpCommand(text = '') {
  return /^help$/i.test(String(text || '').trim());
}

function inferNextState(text = '', currentState = STATES.IDLE) {
  const lower = String(text || '').toLowerCase();
  if (/^(hi|hello|salam|assalam|menu|start)\b/.test(lower)) return STATES.MENU;
  if (lower === '6' || /\b(giveaway|free trial|moclaw|deepseek)\b/i.test(lower)) return STATES.RATES;
  if (lower === '1' || lower.includes('price') || lower.includes('rate')) return STATES.RATES;
  if (lower === '2' || lower.includes('stock') || lower.includes('available')) return STATES.AVAILABILITY;
  if (lower.startsWith('order') || lower.includes('buy')) return STATES.TOOL_SELECT;
  if (/confirm|yes/i.test(lower) && currentState === STATES.POLICY_CONFIRM) return STATES.PAYMENT;
  return currentState || STATES.IDLE;
}

module.exports = {
  STATES,
  getConversation,
  setConversation,
  resetConversation,
  isResetCommand,
  isHelpCommand,
  inferNextState,
  canTransition
};
