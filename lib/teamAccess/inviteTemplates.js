// lib/teamAccess/inviteTemplates.js — Draft-only invite message templates (Roman Urdu / English mix).
// Produces message DRAFTS only; never a real invite link or token.
'use strict';
const roles=require('./defaultRoles');
function draftMessage({ businessName='your workspace', roleId='viewer', emailMasked='***@***' }={}){
  const role=roles.get(roleId); const roleLabel=role?role.label:roleId;
  return {
    subjectDraft:`Invitation: ${roleLabel} access for ${businessName}`,
    bodyDraft:`Assalam o Alaikum,\n\nAap ko ${businessName} ke "${roleLabel}" role par invite kiya ja raha hai (preview).\n`+
      `Yeh sirf ek DRAFT hai — abhi koi live invite send nahi hui aur koi real account create nahi hua.\n`+
      `Approval ke baad operator manually invite bhej sakta hai.\n\nContact (masked): ${emailMasked}\n\nShukriya.`,
    language:'roman_urdu', draftOnly:true,
  };
}
module.exports={ draftMessage };
