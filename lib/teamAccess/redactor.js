// lib/teamAccess/redactor.js — Masks member contact fields (email/phone) for safe previews.
// Never returns full email/phone; only masked, display-safe values.
'use strict';
function maskEmail(email){
  if(!email||typeof email!=='string'||!email.includes('@')) return null;
  const [user,domain]=email.split('@');
  const u=user.length<=2?user[0]+'*':user.slice(0,2)+'***';
  const d=domain.replace(/^[^.]+/, m=>m.slice(0,1)+'***');
  return `${u}@${d}`;
}
function maskPhone(phone){
  if(!phone) return null; const digits=String(phone).replace(/\D/g,'');
  if(digits.length<4) return '***';
  return digits.slice(0,2)+'***'+digits.slice(-2);
}
// Produce a display-safe member object (drops raw email/phone, keeps masked).
function safeMember(m={}){
  return {
    id:m.id, workspaceId:m.workspaceId, userIdSafe:m.userIdSafe||null,
    displayNameSafe:m.displayNameSafe||null, emailMasked:m.emailMasked||maskEmail(m.email)||null,
    phoneMasked:m.phoneMasked||maskPhone(m.phone)||null, roleId:m.roleId, status:m.status,
    seatType:m.seatType, invitedBySafe:m.invitedBySafe||null, lastActiveAt:m.lastActiveAt||null,
    dryRun:m.dryRun!==false, createdAt:m.createdAt, updatedAt:m.updatedAt,
  };
}
module.exports={ maskEmail, maskPhone, safeMember };
