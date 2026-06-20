// lib/groupCommerce/pauseManager.js - Temporary Mute & Response Delay Controls
const groupRegistry = require('./groupRegistry');

function pauseGroup(groupId, minutes) {
  const group = groupRegistry.getGroup(groupId);
  if (!group) return null;

  const mins = parseInt(minutes, 10) || 5;
  const pauseUntil = new Date(Date.now() + mins * 60 * 1000).toISOString();

  return groupRegistry.updateGroupSettings(groupId, {
    pauseSettings: {
      isPaused: true,
      pauseUntil
    }
  });
}

function resumeGroup(groupId) {
  return groupRegistry.updateGroupSettings(groupId, {
    pauseSettings: {
      isPaused: false,
      pauseUntil: null
    }
  });
}

function isGroupPaused(groupId) {
  const group = groupRegistry.getGroup(groupId);
  if (!group) return false;

  const { isPaused, pauseUntil } = group.pauseSettings || {};
  if (!isPaused) return false;

  if (pauseUntil && new Date(pauseUntil) < new Date()) {
    resumeGroup(groupId);
    return false;
  }

  return true;
}

module.exports = {
  pauseGroup,
  resumeGroup,
  isGroupPaused
};
