// lib/teamAccess/config.js — Repository-relative paths + resolved config for Team Access.
// Rejects hardcoded absolute/Windows paths; always resolves under repo root.
'use strict';
const path=require('path');
const { flags }=require('./safetyGuard');
const ROOT=path.join(__dirname,'..','..');
function resolvePath(envVal, fallbackRel){
  const val=envVal&&String(envVal).trim()?String(envVal).trim():fallbackRel;
  if(path.isAbsolute(val)||/^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel); // reject hardcoded abs paths
  return path.join(ROOT, val);
}
const paths={
  root:ROOT,
  store: resolvePath(process.env.TEAM_ACCESS_STORE_PATH,'data/team-access.json'),
  invites: resolvePath(process.env.TEAM_ACCESS_INVITES_PATH,'data/team-invites.json'),
  history: resolvePath(process.env.TEAM_ACCESS_HISTORY_PATH,'data/team-access-history.json'),
};
module.exports={ paths, flags, ROOT };
