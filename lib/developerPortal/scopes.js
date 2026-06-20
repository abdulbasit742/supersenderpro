// developerPortal/scopes.js — scope catalog + validation.
const SCOPES = [
  'read:public_funnel','read:customers_preview','read:support','write:support_draft',
  'read:pilot_ops','read:reseller','read:templates','write:template_preview',
  'read:approvals','write:approval_preview','read:audit','read:kpi',
  'read:deployment','read:compliance','admin:preview'
];
function isValid(s){ return SCOPES.includes(s); }
function filterValid(arr){ return (Array.isArray(arr)?arr:[]).filter(isValid); }
module.exports = { SCOPES, isValid, filterValid };
