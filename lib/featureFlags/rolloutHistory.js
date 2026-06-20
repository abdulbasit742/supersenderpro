// lib/featureFlags/rolloutHistory.js — Records rollout/kill-switch events (local, redacted).
'use strict';
const { paths }=require('./config');
const { readJSON, appendHistory }=require('./store');
function record(entry){ appendHistory(paths.history,{ type:'rollout_event', ...entry }); return true; }
function list(limit=100){ return readJSON(paths.history,[]).filter(e=>e&&/rollout|kill_switch|flag_/.test(e.type||'')).slice(0,limit); }
module.exports={ record, list };
