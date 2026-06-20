// lib/teamAccess/inviteValidator.js — Validates invite-draft inputs without exposing raw PII.
'use strict';
const roles=require('./defaultRoles');
const memberReg=require('./teamMemberRegistry');
function validate(input={}){
  const errors=[]; const warnings=[];
  if(!input.workspaceId) errors.push('workspaceId_required');
  if(!roles.get(input.roleId)) errors.push('invalid_role');
  if(input.seatType&&!memberReg.SEAT_TYPES.includes(input.seatType)) errors.push('invalid_seat_type');
  const hasContact=input.email||input.phone||input.emailMasked||input.phoneMasked;
  if(!hasContact) warnings.push('no_contact_provided');
  // Consent reminder for external contacts.
  if(input.email||input.phone) warnings.push('confirm_consent_before_external_contact');
  return { ok:errors.length===0, errors, warnings };
}
module.exports={ validate };
