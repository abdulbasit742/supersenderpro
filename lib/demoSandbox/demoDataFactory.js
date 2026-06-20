// lib/demoSandbox/demoDataFactory.js — Deterministic fake/demo data generator.
// HARD RULES: no real PII, no real phone/email, no payment refs, no API keys.
// Names are obviously fake; phones/emails are masked; references are demo-prefixed.
'use strict';

// Tiny seeded PRNG so demo data is stable across calls (no Math.random surprises).
function rng(seed){ let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function pick(rnd, arr){ return arr[Math.floor(rnd() * arr.length)]; }
function maskPhone(rnd){ return `+92-3XX-XXX${Math.floor(rnd()*9000+1000)}`; }   // masked, not real
function maskEmail(name){ return `${name.toLowerCase().replace(/[^a-z]/g,'')}@demo.invalid`; } // .invalid is reserved/non-routable
function id(prefix, n){ return `DEMO-${prefix}-${String(n).padStart(4,'0')}`; }

const FIRST = ['Ali','Sana','Bilal','Hira','Usman','Ayesha','Zain','Maryam','Hamza','Noor','Fahad','Rabia'];
const PRODUCTS = ['ChatGPT Plus','Claude Pro','Midjourney','Cursor Pro','Gemini Advanced','Perplexity Pro','Canva Pro','Notion AI'];

const BUSINESS_PROFILES = {
  ai_tools_reseller: { name:'SuperSender AI Tools (Demo)', industry:'AI Tools Reseller', currency:'PKR', country:'PK', language:'roman_urdu' },
  ecommerce_store:    { name:'Demo Mart Online', industry:'Ecommerce Store', currency:'PKR', country:'PK', language:'roman_urdu' },
  wholesale_dealer:   { name:'Demo Wholesale Hub', industry:'Wholesale Dealer', currency:'PKR', country:'PK', language:'urdu' },
  education_channel:  { name:'Demo Learn Academy', industry:'Education Channel', currency:'PKR', country:'PK', language:'english' },
  digital_agency:     { name:'Demo Digital Agency', industry:'Digital Agency', currency:'USD', country:'PK', language:'english' },
};

function businessProfile(key='ai_tools_reseller'){
  const base = BUSINESS_PROFILES[key] || BUSINESS_PROFILES.ai_tools_reseller;
  return { tenantId:'demo-tenant-001', demo:true, dryRun:true, ...base };
}

function customers(n=8, seed=11){
  const rnd = rng(seed); const out=[];
  for (let i=1;i<=n;i++){ const f=pick(rnd,FIRST);
    out.push({ id:id('CUST',i), name:`${f} (Demo)`, phoneMasked:maskPhone(rnd), emailMasked:maskEmail(f+i),
      tags:[pick(rnd,['lead','repeat','vip','cold','warm'])], language:pick(rnd,['roman_urdu','urdu','english']),
      status:pick(rnd,['active','new','dormant']), demo:true });
  } return out;
}
function orders(n=6, seed=22){
  const rnd = rng(seed); const out=[];
  for (let i=1;i<=n;i++){ out.push({ id:id('ORD',i), product:pick(rnd,PRODUCTS), qty:Math.ceil(rnd()*3),
    amount:Math.floor(rnd()*9000+1000), currency:'PKR', paymentStatus:pick(rnd,['paid','pending','failed','overdue']),
    deliveryStatus:pick(rnd,['delivered','processing','shipped','cancelled']), demo:true }); }
  return out;
}
function payments(n=6, seed=33){
  const rnd = rng(seed); const out=[];
  for (let i=1;i<=n;i++){ out.push({ id:id('PAY',i), referenceMasked:`DEMO-REF-****${Math.floor(rnd()*9000+1000)}`,
    amount:Math.floor(rnd()*9000+1000), currency:'PKR', status:pick(rnd,['pending review','received','failed','overdue']),
    method:pick(rnd,['easypaisa(demo)','jazzcash(demo)','bank(demo)']), demo:true }); }
  return out;
}
function whatsapp(seed=44){
  const rnd = rng(seed);
  return {
    chatPreviews:[ {id:id('WA',1),from:'Ali (Demo)',preview:'Bhai ChatGPT plus available hai?',unread:2,demo:true},
                   {id:id('WA',2),from:'Sana (Demo)',preview:'Order kab tak deliver hoga?',unread:0,demo:true} ],
    groupMessages:[ {id:id('WAG',1),group:'Resellers (Demo)',text:'Naya stock aa gaya 🎉',demo:true} ],
    channelPostDrafts:[ {id:id('WAC',1),title:'Flash Sale (Demo)',body:'AI tools par 20% off — demo only',status:'draft',demo:true} ],
    adminCommands:[ {cmd:'/stock',desc:'show stock (demo)'}, {cmd:'/orders today',desc:'today orders (demo)'} ],
  };
}
function ecommerce(seed=55){
  const rnd = rng(seed);
  return PRODUCTS.slice(0,6).map((p,i)=>({ id:id('SKU',i+1), name:p, price:Math.floor(rnd()*8000+800), currency:'PKR',
    stock:pick(rnd,['in_stock','low_stock','out_of_stock']), priceDrop:rnd()>0.6, flashSale:rnd()>0.7, demo:true }));
}
function voiceAI(){
  return { transcript:'[DEMO] Customer: ChatGPT plus ka price kya hai? Agent: Demo price 2500 PKR.', 
    replyDraft:'[DEMO voice reply] Assalam o alaikum, ye demo voice reply hai — koi real call nahi hui.',
    providerStatus:'demo (no real provider connected)', demo:true, dryRun:true };
}
function marketplace(seed=66){
  const rnd = rng(seed);
  return { sellerOffers:[{id:id('OFF',1),sku:pick(rnd,PRODUCTS),price:Math.floor(rnd()*5000+500),demo:true}],
    buyerRequests:[{id:id('REQ',1),sku:pick(rnd,PRODUCTS),budget:Math.floor(rnd()*6000+1000),demo:true}],
    skuPriceChanges:[{sku:pick(rnd,PRODUCTS),oldPrice:3000,newPrice:2700,change:'-10%',demo:true}] };
}
function kpi(seed=77){
  const rnd = rng(seed);
  return { revenue:Math.floor(rnd()*200000+50000), orders:Math.floor(rnd()*80+20), customers:Math.floor(rnd()*300+100),
    incidents:Math.floor(rnd()*4), opportunities:Math.floor(rnd()*12+3), currency:'PKR', demo:true };
}
function saasBilling(){
  return { plans:[{id:'demo-free',name:'Demo Free',price:0},{id:'demo-pro',name:'Demo Pro',price:4900,currency:'PKR'}],
    tenantStatus:'demo-active', invoiceDraft:{id:id('INV',1),amount:4900,currency:'PKR',status:'draft',demo:true},
    usageWarnings:['[DEMO] 80% of demo message quota used'], demo:true };
}

// Full bundle for a given business preset.
function generateAll(scenarioKey='ai_tools_reseller'){
  return {
    demo:true, dryRun:true, generatedAt:new Date().toISOString(),
    business: businessProfile(scenarioKey),
    customers: customers(),
    orders: orders(),
    payments: payments(),
    whatsapp: whatsapp(),
    ecommerce: ecommerce(),
    voiceAI: voiceAI(),
    marketplace: marketplace(),
    kpi: kpi(),
    saasBilling: saasBilling(),
  };
}

const MODULE_MAP = {
  business: (k)=>businessProfile(k), customers, orders, payments,
  whatsapp, ecommerce, voiceAI, marketplace, kpi, saasBilling,
};
function generateModule(moduleId, scenarioKey='ai_tools_reseller'){
  const fn = MODULE_MAP[moduleId];
  if (!fn) return { ok:false, error:'unknown_module', moduleId, demo:true };
  const data = moduleId === 'business' ? fn(scenarioKey) : fn();
  return { ok:true, moduleId, demo:true, dryRun:true, data };
}

module.exports = { BUSINESS_PROFILES, businessProfile, customers, orders, payments, whatsapp,
  ecommerce, voiceAI, marketplace, kpi, saasBilling, generateAll, generateModule, MODULE_MAP };
