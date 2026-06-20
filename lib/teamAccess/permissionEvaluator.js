// lib/teamAccess/permissionEvaluator.js — Pure role->permission evaluation (no side effects).
'use strict';
const matrix=require('./rolePermissionMatrix');
const perms=require('./defaultPermissions');
function evaluate(roleId, permission){
  const granted=matrix.has(roleId, permission);
  return { granted, risky:perms.isRisky(permission), roleId, permission };
}
module.exports={ evaluate };
