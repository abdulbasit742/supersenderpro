const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');

async function showWelcomeMenu(runtime, jid, number) {
  queries.upsertConversation(number, 'MENU_SHOWN', {});
  return runtime.sendText(jid, fmt.welcomeMessage(runtime.config.botName, runtime.config.greeting));
}

module.exports = {
  showWelcomeMenu
};
