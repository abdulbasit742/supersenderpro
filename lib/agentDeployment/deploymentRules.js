const store = require('./store');
const registry = require('./agentRegistry');
const channelTargets = require('./channelTargets');

const MODES = ['suggest_only', 'draft_only', 'approval_required', 'supervised_live', 'disabled'];

function newId() {
  return 'dep_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


function defaults(input) {
  const now = new Date().toISOString();
     return {
       id: input.id || newId(),
         agentId: input.agentId,
         targetType: input.targetType,
         targetId: input.targetId || null,
         targetName: input.targetName || '',
         enabled: false,
         mode: MODES.includes(input.mode) ? input.mode : 'suggest_only',
         dryRun: true,
         approvalRequired: true,
         scheduleWindow: input.scheduleWindow || null,
         rateLimit: input.rateLimit || null,
         rules: input.rules || {},
         lastRunAt: null,
         status: 'inactive',
         warnings: [],
         createdAt: now,
         updatedAt: now,
     };
}

function validate(input) {
     const errors = [];
     if (!input.agentId || !registry.get(input.agentId)) errors.push('unknown_agent');
     if (!channelTargets.isValidTarget(input.targetType)) errors.push('invalid_target_type');
     if (input.mode && !MODES.includes(input.mode)) errors.push('invalid_mode');
     // supervised_live only permitted if target has a live flag AND it is on
     if (input.mode === 'supervised_live' && !channelTargets.isLiveAllowed(input.targetType)) {
         errors.push('supervised_live_blocked_live_flag_off');
     }

   return errors;
}

function list() { return Object.values(store.load().deployments); }
function get(id) { return store.load().deployments[id] || null; }

function create(input) {
   const errors = validate(input || {});
   if (errors.length) return { ok: false, errors };
   const state = store.load();
   const dep = defaults(input);
   const warns = [];
   if (!channelTargets.isLiveAllowed(dep.targetType)) warns.push('live_disabled_for_target');
   dep.warnings = warns;
   state.deployments[dep.id] = dep;
   store.save(state);
   store.appendHistory({ kind: 'deployment_created', deploymentId: dep.id, agentId: dep.agentId, targetType:
dep.targetType });
 return { ok: true, deployment: dep };
}

function update(id, patch) {
 const state = store.load();
   const cur = state.deployments[id];
   if (!cur) return { ok: false, errors: ['not_found'] };
   const merged = Object.assign({}, cur, patch);
   const errors = validate(merged);
   if (errors.length) return { ok: false, errors };
   merged.id = cur.id; merged.createdAt = cur.createdAt; merged.updatedAt = new Date().toISOString();
   if (process.env.AGENT_DEPLOYMENT_DRY_RUN !== 'false') merged.dryRun = true;
   state.deployments[id] = merged;
   store.save(state);
   store.appendHistory({ kind: 'deployment_updated', deploymentId: id });
   return { ok: true, deployment: merged };
}

function setEnabled(id, enabled) {
   const state = store.load();
   const dep = state.deployments[id];
   if (!dep) return { ok: false, errors: ['not_found'] };
   dep.enabled = !!enabled;
 dep.status = enabled ? (dep.mode === 'supervised_live' && channelTargets.isLiveAllowed(dep.targetType) ?
'live_supervised' : 'active_dry_run') : 'inactive';
   dep.updatedAt = new Date().toISOString();
   store.save(state);
   store.appendHistory({ kind: enabled ? 'deployment_enabled' : 'deployment_disabled', deploymentId: id });
   return { ok: true, deployment: dep };
}

function remove(id) {
 const state = store.load();
   if (!state.deployments[id]) return false;
   delete state.deployments[id];
   store.save(state);
   store.appendHistory({ kind: 'deployment_deleted', deploymentId: id });
   return true;
}

module.exports = { MODES, list, get, create, update, setEnabled, remove, validate, defaults };
