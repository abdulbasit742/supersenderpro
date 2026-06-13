const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { findToolByInput } = require('../../config/tools');

async function showRates(runtime, jid, number) {
  const rows = queries.getAvailabilitySnapshot();
  queries.upsertConversation(number, 'VIEWING_RATES', {});
  return runtime.sendText(jid, fmt.formatDailyRates(rows));
}

async function showToolPlans(runtime, jid, number, text) {
  const tool = findToolByInput(text);
  if (!tool) return false;
  const rows = queries.getAvailabilitySnapshot(tool.slug);
  queries.upsertConversation(number, 'SELECTING_PLAN', { toolSlug: tool.slug });
  await runtime.sendText(jid, fmt.formatToolPlans(tool.name, rows));
  return true;
}

module.exports = {
  showRates,
  showToolPlans
};
