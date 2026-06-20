// lib/groupCommerce/groupRegistry.js - Group Configuration & Registration
const store = require('./store');

function registerGroup(group) {
  const data = store.readRegistry();
  const existingIndex = data.groups.findIndex(g => g.groupId === group.groupId);

  const newGroup = {
    groupId: group.groupId,
    groupName: group.groupName || 'Unnamed Group',
    platform: group.platform || 'whatsapp',
    linkedTenantId: group.linkedTenantId || null,
    linkedEcommerceStoreId: group.linkedEcommerceStoreId || null,
    linkedCatalogId: group.linkedCatalogId || 'cat-' + group.groupId,
    adminNumbers: (group.adminNumbers || []).map(store.maskPhoneNumber),
    allowedCommands: group.allowedCommands || ["help", "status", "catalog", "products", "stock", "price", "sellers", "rules", "pause", "resume"],
    moderationMode: group.moderationMode !== false,
    commerceMode: group.commerceMode !== false,
    aiAgentMode: group.aiAgentMode !== false,
    relaySettings: group.relaySettings || { enabled: false, channels: [] },
    pauseSettings: group.pauseSettings || { isPaused: false, pauseUntil: null },
    createdAt: group.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex > -1) {
    data.groups[existingIndex] = { ...data.groups[existingIndex], ...newGroup, updatedAt: new Date().toISOString() };
  } else {
    data.groups.push(newGroup);
  }

  store.writeRegistry(data);
  return newGroup;
}

function listGroups() {
  return store.readRegistry().groups;
}

function getGroup(groupId) {
  const groups = listGroups();
  return groups.find(g => g.groupId === groupId) || null;
}

function updateGroupSettings(groupId, settings) {
  const data = store.readRegistry();
  const index = data.groups.findIndex(g => g.groupId === groupId);
  if (index === -1) return null;

  data.groups[index] = {
    ...data.groups[index],
    ...settings,
    updatedAt: new Date().toISOString()
  };

  store.writeRegistry(data);
  return data.groups[index];
}

function enableCommerceMode(groupId, enabled) {
  return updateGroupSettings(groupId, { commerceMode: !!enabled });
}

function enableAiAgentMode(groupId, enabled) {
  return updateGroupSettings(groupId, { aiAgentMode: !!enabled });
}

function enableRelayMode(groupId, enabled) {
  const group = getGroup(groupId);
  if (!group) return null;
  const relaySettings = { ...group.relaySettings, enabled: !!enabled };
  return updateGroupSettings(groupId, { relaySettings });
}

module.exports = {
  registerGroup,
  listGroups,
  getGroup,
  updateGroupSettings,
  enableCommerceMode,
  enableAiAgentMode,
  enableRelayMode
};
