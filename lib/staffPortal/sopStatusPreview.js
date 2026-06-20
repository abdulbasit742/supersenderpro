// lib/staffPortal/sopStatusPreview.js — Safe SOP checklist status preview. No SOP mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listSops(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const sops = (staff.sops || []).map((s) => {
    if (s.status === 'incomplete') warnings.push('sop_incomplete');
    return {
      sopIdPreview: maskRef(s.id, 'sop'),
      nameSafe: safeText(s.name),
      statusPreview: `${s.status}_preview`,
      progressPreview: `${s.done || 0}/${s.steps || 0}`,
    };
  });
  return safeResponse({ liveSopMutation: false, sopsPreview: sops, warnings });
}
function getSopStatusPreview(input = {}) {
  const list = listSops(input);
  return safeResponse({ liveSopMutation: false, sopPreview: (list.sopsPreview || [])[0] || {}, warnings: list.warnings });
}
module.exports = { listSops, getSopStatusPreview };
