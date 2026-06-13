const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');

async function showSupport(runtime, jid, number) {
  queries.upsertConversation(number, 'AWAITING_ISSUE_ORDER', {});
  return runtime.sendText(jid, `${fmt.helpMessage()}\n\n${fmt.issuePrompt(null)}`);
}

async function captureBotServiceLead(runtime, jid, number, text, name = '') {
  queries.upsertCustomer(number, name || number);
  queries.upsertConversation(number, 'AWAITING_SERVICE_DETAILS', {});
  await runtime.sendText(jid, fmt.botServiceMenu());
  const adminJid = runtime.adminJid();
  if (adminJid) {
    await runtime.sendText(adminJid, fmt.adminLeadAlert(number, name || number, text));
  }
}

async function handleServiceLeadState(runtime, jid, number, text, name = '') {
  const adminJid = runtime.adminJid();
  if (adminJid) {
    await runtime.sendText(adminJid, fmt.adminLeadAlert(number, name || number, `Service detail: ${text}`));
  }
  queries.resetConversation(number);
  return runtime.sendText(jid, `✅ Requirement mil gayi.\nHamari team aap ko is number par contact karegi.\n\nAgar AI tools order karna ho to *menu* likh dein.`);
}

module.exports = {
  showSupport,
  captureBotServiceLead,
  handleServiceLeadState
};
