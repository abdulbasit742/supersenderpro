const env = require('../config/env');
const { monitorGroupMessage } = require('./trustManager');

function isSellingGroup(groupId = '') {
  return env.sellingGroups.includes(groupId);
}

async function analyzeGroupMessage({ text, sender, groupId, groupName = '', pushName = '', sessionKey = 'main' }) {
  if (!isSellingGroup(groupId)) return { status: 'not_selling_group' };
  return monitorGroupMessage({ text, sender, groupName, pushName, sessionKey }, groupId);
}

module.exports = {
  isSellingGroup,
  analyzeGroupMessage,
  monitorGroupMessage
};
