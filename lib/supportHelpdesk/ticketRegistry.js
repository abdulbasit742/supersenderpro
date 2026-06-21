'use strict';
const store = require('./store');
const privacyGuard = require('./privacyGuard');
const classifier = require('./ticketClassifier');
const priorityScoring = require('./priorityScoring');
const SOURCES = ['whatsapp_chat','whatsapp_group','customer_360','pilot_ops','public_funnel','tenant_portal','voice_ai','admin_manual','email_placeholder','social_placeholder'];
const STATUSES = ['new','open','waiting_customer','waiting_admin','escalated','resolved','archived'];
function newId() { return 'tkt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function defaults(input) {
  const i = input || {}; const now = new Date().toISOString();
  const desc = privacyGuard.safePreview(i.description || i.rawMessage || '', 280);
  const cls = classifier.classify((i.title || '') + ' ' + desc);
  const base = { id: i.id || newId(), customerId: i.customerId || null, pilotId: i.pilotId || null, tenantId: i.tenantId || null,
    sourceType: SOURCES.includes(i.sourceType) ? i.sourceType : 'admin_manual', sourceId: i.sourceId || null,
    customerNameSafe: privacyGuard.maskName(i.customerName || ''), customerPhoneMasked: privacyGuard.maskPhone(i.customerPhone || ''), customerEmailMasked: privacyGuard.maskValue(i.customerEmail || ''),
    title: privacyGuard.maskValue(i.title || 'Untitled ticket'), descriptionSafe: desc, category: classifier.CATEGORIES.includes(i.category) ? i.category : cls.category,
    priority: i.priority || null, status: STATUSES.includes(i.status) ? i.status : 'new', sentiment: cls.sentiment, relatedModule: i.relatedModule || null,
    assignedTo: i.assignedTo || null, aiSummary: null, suggestedReply: null, escalationRequired: false, dryRun: true, createdAt: i.createdAt || now, updatedAt: now };
  base.priority = i.priority || priorityScoring.score(base); return base;
}
function list(filter) { let t = Object.values(store.load().tickets); const f = filter || {}; if (f.status) t = t.filter((x)=>x.status===f.status); if (f.category) t=t.filter((x)=>x.category===f.category); if (f.priority) t=t.filter((x)=>x.priority===f.priority); if (f.source) t=t.filter((x)=>x.sourceType===f.source); return t; }
function get(id) { return store.load().tickets[id] || null; }
function create(input) { const s = store.load(); const t = defaults(input); s.tickets[t.id] = t; store.save(s); store.appendHistory({ kind:'ticket_created', id:t.id, category:t.category, priority:t.priority }); return { ok:true, ticket:t }; }
function update(id, patch) { const s=store.load(); const cur=s.tickets[id]; if(!cur) return {ok:false, errors:['not_found']}; if(patch.status && !STATUSES.includes(patch.status)) return {ok:false, errors:['invalid_status']}; const next=Object.assign({},cur,privacyGuard.maskDeep(patch||{}),{id:cur.id,createdAt:cur.createdAt,updatedAt:new Date().toISOString(),dryRun:true}); s.tickets[id]=next; store.save(s); store.appendHistory({kind:'ticket_updated', id}); return {ok:true,ticket:next}; }
function setStatus(id,status){return update(id,{status});}
module.exports={SOURCES,STATUSES,defaults,list,get,create,update,setStatus,newId};
