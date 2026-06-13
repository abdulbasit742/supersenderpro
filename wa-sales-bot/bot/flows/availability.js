const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { findToolByInput } = require('../../config/tools');

async function showAvailability(runtime, jid, number, text = '') {
  const tool = text ? findToolByInput(text) : null;
  const rows = queries.getAvailabilitySnapshot(tool?.slug || '');
  queries.upsertConversation(number, 'CHECKING_AVAILABILITY', {
    toolSlug: tool?.slug || ''
  });
  return runtime.sendText(jid, fmt.formatAvailability(rows, tool ? `${tool.name} Availability` : 'Real-time Availability'));
}

module.exports = {
  showAvailability
};
