// lib/groupCommerce/pauseManager.js
// Group Commerce OS - per-group pause controls. Auto-resume after pauseUntil.


'use strict';


const registry = require('./groupRegistry');


const CONFIG = {
  defaultMin: Number(process.env.GROUP_COMMERCE_DEFAULT_PAUSE_MINUTES || 5),
     maxMin: Number(process.env.GROUP_COMMERCE_MAX_PAUSE_MINUTES || 10),
};
const nowMs = () => Date.now();


// scope: which activities to pause, e.g. ['ai','moderation','extraction']. Empty = all.
function pause(groupId, minutes, scope) {
     const g = registry.get(groupId);
     if (!g) return { ok: false, error: 'group not found' };
     let m = Number(minutes) || CONFIG.defaultMin;
     m = Math.max(1, Math.min(CONFIG.maxMin, m));
     const pausedUntil = nowMs() + m * 60 * 1000;
     registry.update(groupId, { pauseSettings: { pausedUntil, scope: Array.isArray(scope) ? scope : [] } });


   return { ok: true, pausedUntil, minutes: m, scope: scope || 'all' };
}

function resume(groupId) {
 const g = registry.get(groupId);
   if (!g) return { ok: false, error: 'group not found' };
   registry.update(groupId, { pauseSettings: { pausedUntil: 0, scope: [] } });
   return { ok: true, resumed: true };
}


// Is a given activity paused right now?
function isPaused(groupId, activity) {
 const g = registry.get(groupId);
   if (!g || !g.pauseSettings) return false;
   const until = g.pauseSettings.pausedUntil || 0;
   if (until <= nowMs()) return false;
   const scope = g.pauseSettings.scope || [];
   return scope.length === 0 || scope.includes(activity);
}


module.exports = { pause, resume, isPaused, CONFIG };
