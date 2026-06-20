// lib/featureFlags/killSwitches.js — Reads kill-switch state for flags (preview-aware).
'use strict';
const registry=require('./featureRegistry');
function isKilled(flag){ return !!flag && (flag.killSwitchEnabled===true || flag.status==='killed' || flag.rolloutMode==='killed'); }
function list(){ return registry.all().filter(isKilled).map(f=>({ key:f.key, name:f.name, moduleId:f.moduleId, status:f.status, killSwitchEnabled:f.killSwitchEnabled })); }
module.exports={ isKilled, list };
