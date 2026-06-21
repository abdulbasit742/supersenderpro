'use strict';
const store = require('../../lib/jsonStore');
const FILE = 'canned_replies';
const DEFAULTS = [
 { shortcut:'/price', title:'Pricing', body:'Hi {name}! Our plans start at Rs.999/mo. Reply PLANS for full details.' },
 { shortcut:'/salam', title:'Greeting', body:'Walaikum Assalam {name}! How can I help you today?' },
 { shortcut:'/pay', title:'Payment', body:'You can pay via EasyPaisa / JazzCash. Share a screenshot once done and we will confirm.' },
 { shortcut:'/thanks', title:'Thanks', body:'Thank you {name}! Let us know if you need anything else.' },
];
function nowIso(){return new Date().toISOString();} function genId(){return 'cr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
function list(){ const existing=store.read(FILE,null); if(existing && Array.isArray(existing)) return existing; const seeded=DEFAULTS.map((d)=>Object.assign({id:genId(),createdAt:nowIso()},d)); store.write(FILE,seeded); return seeded; }
function create(input){ const errors=[]; if(!input||!input.shortcut||!/^\//.test(input.shortcut)) errors.push("shortcut is required and must start with '/'"); if(!input||!input.body) errors.push('body is required'); if(errors.length) return {ok:false,errors}; const all=list(); if(all.find((c)=>c.shortcut===input.shortcut)) return {ok:false,errors:['shortcut already exists']}; const record={id:genId(),shortcut:input.shortcut,title:input.title||input.shortcut,body:input.body,createdAt:nowIso()}; all.push(record); store.write(FILE,all); return {ok:true,reply:record}; }
function remove(id){ const all=list(); const next=all.filter((c)=>c.id!==id); if(next.length===all.length) return {ok:false,errors:['not found']}; store.write(FILE,next); return {ok:true}; }
function render(body,ctx){ const vars={name:(ctx&&ctx.name)||'there',channel:(ctx&&ctx.channel)||''}; return String(body||'').replace(/\{(\w+)\}/g,(m,k)=>(k in vars ? vars[k] : m)); }
function expand(text,ctx){ const trimmed=String(text||'').trim(); const match=list().find((c)=>c.shortcut===trimmed); return match ? render(match.body,ctx) : null; }
module.exports = { list, create, remove, render, expand };
