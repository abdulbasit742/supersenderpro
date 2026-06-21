'use strict';
const store = require('./store');
const CATEGORIES = ['getting_started','whatsapp_setup','channel_automation','business_setup','voice_ai','customer_360','saas_billing','public_funnel','demo_sandbox','deployment','troubleshooting','compliance','faq'];
const VISIBILITY = ['internal','public_safe','admin_only'];
function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function newId() { return 'kb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function defaults(i) { const now = new Date().toISOString(); return { id: i.id || newId(), title: i.title || 'Untitled', slug: i.slug || slugify(i.title), category: CATEGORIES.includes(i.category) ? i.category : 'faq', summary: i.summary || '', body: i.body || '', tags: i.tags || [], relatedModules: i.relatedModules || [], visibility: VISIBILITY.includes(i.visibility) ? i.visibility : 'internal', status: i.status || 'draft', lastReviewedAt: i.lastReviewedAt || null, createdAt: i.createdAt || now, updatedAt: now }; }
function list(filter) { let a = Object.values(store.loadKb().articles || {}); const f = filter || {}; if (f.category) a = a.filter((x)=>x.category===f.category); if (f.visibility) a = a.filter((x)=>x.visibility===f.visibility); return a; }
function get(id) { return (store.loadKb().articles || {})[id] || null; }
function upsert(input) { const kb = store.loadKb(); kb.articles = kb.articles || {}; const art = input.id && kb.articles[input.id] ? Object.assign({}, kb.articles[input.id], input, { updatedAt: new Date().toISOString() }) : defaults(input || {}); kb.articles[art.id]=art; store.saveKb(kb); return { ok:true, article:art }; }
function review(id) { const kb = store.loadKb(); const a=(kb.articles || {})[id]; if(!a) return {ok:false,errors:['not_found']}; a.lastReviewedAt=new Date().toISOString(); a.status='published'; store.saveKb(kb); return {ok:true, article:a}; }
module.exports = { CATEGORIES, VISIBILITY, slugify, defaults, list, get, upsert, review };
