'use strict';
const path = require('path');
function tryRequire(rels){ for(const r of rels){ try{return require(path.resolve(process.cwd(),r));}catch(e){} } return null; }
const existingDemoMode = tryRequire(['src/modules/demoMode']);
function fakePhone(i){ return '+1-555-0' + String(100 + (i % 800)).padStart(3,'0'); }
function fakeEmail(i){ return 'demo' + i + '@example.test'; }
function maskedName(i){ return ['A','S','B','F','U','Z','H','O'][i%8] + '*** (demo)'; }
function businessProfiles(){ return [{id:'demo_biz_reseller',type:'ai_tools_reseller',name:'Demo AI Tools Reseller',currency:'PKR',country:'PK',demo:true},{id:'demo_biz_ecom',type:'ecommerce_store',name:'Demo Ecommerce Store',currency:'PKR',country:'PK',demo:true}]; }
function customers(n=8){ return Array.from({length:n},(_,i)=>({id:'demo_cust_'+i,name:maskedName(i),phoneMasked:fakePhone(i),emailMasked:fakeEmail(i),tags:['demo',i%2?'paid':'lead'],status:['active','trial','lead'][i%3],demo:true})); }
function orders(n=6){ return Array.from({length:n},(_,i)=>({id:'demo_ord_'+i,customerId:'demo_cust_'+(i%8),product:['Demo Plan A','Demo Plan B','Demo Plan C'][i%3],paymentStatus:['pending','received','failed','overdue'][i%4],amount:1000+i*250,currency:'PKR',demo:true})); }
function payments(n=6){ return Array.from({length:n},(_,i)=>({id:'demo_pay_'+i,refMasked:'DEMO-****'+(1000+i),status:['pending_review','received','failed','overdue'][i%4],amount:1000+i*250,currency:'PKR',demo:true})); }
function whatsapp(){ return { chats:Array.from({length:4},(_,i)=>({id:'demo_chat_'+i,fromMasked:fakePhone(i),preview:'rate kya hai? (demo)',demo:true})), groupMessages:[{id:'demo_grp_0',group:'Demo Resellers',text:'stock available? (demo)',demo:true}], channelPostDrafts:[{id:'demo_post_0',text:'Flash sale 25% off (demo draft)',demo:true}], adminCommands:['!campaigns','!offers','!campaignkpi'] }; }
function ecommerce(n=5){ return Array.from({length:n},(_,i)=>({id:'demo_prod_'+i,name:'Demo Product '+(i+1),price:500+i*100,stock:['in_stock','low','out'][i%3],demo:true})); }
function voiceAI(){ return { transcript:'[demo] Customer: rate batao. Agent: ji 25% off chal raha hai.', replyDraft:'[demo voice script] Shukriya, aapka order confirm ho gaya.', providerStatus:'demo_unavailable', demo:true }; }
function marketplace(){ return { sellerOffers:[{id:'demo_offer_0',sku:'DEMO-SKU',price:1300,demo:true}], buyerRequests:[{id:'demo_req_0',sku:'DEMO-SKU',qty:3,demo:true}], priceChanges:[{sku:'DEMO-SKU',from:1500,to:1300,demo:true}] }; }
function kpis(){ return { revenue:125000, orders:42, customers:8, incidents:1, opportunities:3, currency:'PKR', confidence:'demo', demo:true }; }
function saasBilling(){ return { plans:[{id:'demo_plan_pro',name:'Pro (demo)',price:2499}], tenantStatus:'demo_active', invoiceDraft:{id:'demo_inv_0',amount:2499,status:'draft'}, usageWarnings:['demo: 80% of message quota'], demo:true }; }
function generate(scenarioId){ const existing = existingDemoMode && typeof existingDemoMode.status==='function' ? (()=>{try{return existingDemoMode.status();}catch(e){return null;}})() : null; return { demo:true,dryRun:true,scenario:scenarioId||'ai_tools_reseller',existingDemoModeStatus:existing,businessProfiles:businessProfiles(),customers:customers(),orders:orders(),payments:payments(),whatsapp:whatsapp(),ecommerce:ecommerce(),voiceAI:voiceAI(),marketplace:marketplace(),kpis:kpis(),saasBilling:saasBilling() }; }
function forModule(moduleId, scenarioId){ const all=generate(scenarioId); return all[moduleId]!=null ? {demo:true,dryRun:true,moduleId,data:all[moduleId]} : {demo:true,available:false,moduleId}; }
module.exports = { generate, forModule, businessProfiles, customers, orders, payments, whatsapp, ecommerce, voiceAI, marketplace, kpis, saasBilling, fakePhone, fakeEmail };
