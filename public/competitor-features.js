// Competitor Features Control Center — live UI for all /api/wati/* endpoints
const FEATURES = [
  { cat: 'Pricing & Cost Intelligence' },
  { title: 'Conversation Cost Tracker', sub: 'Log a Meta conversation cost', method: 'POST', path: '/api/wati/costs/log',
    fields: [{k:'category',type:'select',opts:['marketing','utility','authentication','service']},{k:'country',v:'PK'}] },
  { title: 'Cost Analytics', sub: 'View total spend + markup savings', method: 'GET', path: '/api/wati/costs',
    fields: [{k:'tenantId',v:'default-tenant',query:true}] },
  { title: 'Dynamic Pricing Bandit', sub: 'Optimize price by stock & demand', method: 'POST', path: '/api/wati/algorithms/pricing-optimize',
    fields: [{k:'productId',v:'AI-PRO-001'},{k:'basePrice',v:'3500',type:'number'},{k:'stock',v:'2',type:'number'},{k:'demandVelocity',v:'8',type:'number'}] },
  { title: 'Coupon Generator', sub: 'Create a discount voucher', method: 'POST', path: '/api/wati/coupons/create',
    fields: [{k:'discountPercent',v:'15',type:'number'},{k:'maxUses',v:'100',type:'number'},{k:'expiryDays',v:'7',type:'number'}] },
  { title: 'Coupon Validator', sub: 'Validate & redeem a coupon', method: 'POST', path: '/api/wati/coupons/validate',
    fields: [{k:'code',v:'SSP-XXXXXX'}] },

  { cat: 'AI & Algorithms' },
  { title: 'Churn Risk Predictor', sub: 'Predict customer churn risk', method: 'POST', path: '/api/wati/algorithms/churn-predict',
    fields: [{k:'phone',v:'923001234567'},{k:'lastActiveDays',v:'14',type:'number'},{k:'totalMessages',v:'4',type:'number'},{k:'failedPayments',v:'1',type:'number'}] },
  { title: 'Sentiment Auto-Escalation', sub: 'Detect angry customers', method: 'POST', path: '/api/wati/sentiment/analyze',
    fields: [{k:'phone',v:'923001234567'},{k:'message',type:'textarea',v:'ye bilkul bekar service hai paisa wapis karo'}] },
  { title: 'Customer Lifetime Value', sub: 'Predict CLV & tier', method: 'POST', path: '/api/wati/analytics/clv',
    fields: [{k:'avgOrderValue',v:'1500',type:'number'},{k:'ordersPerMonth',v:'2',type:'number'},{k:'retentionMonths',v:'12',type:'number'},{k:'grossMargin',v:'0.4',type:'number'}] },
  { title: 'Smart FAQ Responder', sub: 'Auto-answer with confidence', method: 'POST', path: '/api/wati/faq/answer',
    fields: [{k:'question',v:'what is your price for chatgpt?'}], raw:'faqs', rawVal:'[{"question":"chatgpt price","keywords":["price","chatgpt","rate"],"answer":"ChatGPT Plus is Rs 3500/month."}]' },
  { title: 'Lead Scoring Pipeline', sub: 'Run pluggable algorithm', method: 'POST', path: '/api/wati/algorithms/pipeline/run',
    fields: [{k:'algorithmId',v:'lead-scoring-model'}], raw:'payload', rawVal:'{"messagesCount":12,"intentScore":0.9,"delayHours":1}' },
  { title: 'Product Recommender', sub: 'Next-best-offer suggestions', method: 'POST', path: '/api/wati/recommend/products',
    fields: [{k:'purchasedProductId',v:'chatgpt'},{k:'customerTier',type:'select',opts:['Standard','Silver','Gold','VIP']}] },
  { title: 'Language Auto-Detect', sub: 'Detect Urdu/Roman/English', method: 'POST', path: '/api/wati/language/detect',
    fields: [{k:'message',type:'textarea',v:'bhai iska rate kya hai?'}] },

  { cat: 'Campaigns & Broadcasts' },
  { title: 'Smart Retargeting', sub: 'Re-target unread leads', method: 'POST', path: '/api/wati/campaigns/retarget',
    fields: [{k:'parentCampaignId',v:'CAMP-123'},{k:'followUpTemplateId',v:'TMPL-1'}] },
  { title: 'Drip Sequencer', sub: 'Build time-delayed sequence', method: 'POST', path: '/api/wati/drip/create',
    fields: [{k:'name',v:'Welcome Series'}], raw:'steps', rawVal:'[{"delayHours":0,"message":"Welcome!"},{"delayHours":24,"message":"Need help choosing?"}]' },
  { title: 'Anti-Ban Throttle', sub: 'Safe sending limits', method: 'GET', path: '/api/wati/anti-ban/throttle',
    fields: [{k:'accountAgeDays',v:'15',query:true},{k:'dailySentSoFar',v:'40',query:true}] },
  { title: 'QR Click-to-Chat Campaign', sub: 'Generate WhatsApp QR', method: 'POST', path: '/api/wati/qr-campaign/create',
    fields: [{k:'campaignName',v:'Ramadan Sale'},{k:'prefilledText',type:'textarea',v:'Hi! I want to know about the Ramadan offer.'}] },
  { title: 'Win-back Re-engagement', sub: 'Dormant customer offers', method: 'POST', path: '/api/wati/reengage/winback',
    fields: [{k:'phone',v:'923001234567'},{k:'lastActiveDays',v:'95',type:'number'}] },
  { title: 'Chat-Out Cart Pre-fill', sub: 'Charles-style checkout button', method: 'POST', path: '/api/wati/checkout/chat-out',
    fields: [{k:'productId',v:'PROD-001'},{k:'qty',v:'1',type:'number'},{k:'discountCode',v:'SAVE10'}] },

  { cat: 'CRM, Engagement & Operations' },
  { title: 'Click-to-WA Ads RoAS', sub: 'Campaign return analysis', method: 'GET', path: '/api/wati/ads/campaign/AD-123/roas',
    fields: [{k:'tenantId',v:'default-tenant',query:true}] },
  { title: 'Agent Presence Collision', sub: 'Shared inbox warning', method: 'POST', path: '/api/wati/presence/register',
    fields: [{k:'chatId',v:'chat-923001234567'},{k:'agentId',v:'agent-007'},{k:'action',type:'select',opts:['viewing','typing']}] },
  { title: 'CRM Stage Transition', sub: 'GoHighLevel-style triggers', method: 'POST', path: '/api/wati/crm/transition',
    fields: [{k:'leadId',v:'LEAD-1'},{k:'phone',v:'923001234567'},{k:'previousStage',v:'New'},{k:'newStage',v:'Qualified'}] },
  { title: 'Cart Recovery Flow', sub: 'Abandoned cart sequence', method: 'POST', path: '/api/wati/cart-recovery',
    fields: [{k:'phone',v:'923001234567'}], raw:'cartItems', rawVal:'[{"name":"ChatGPT Plus","price":3500,"qty":1}]' },
  { title: 'Loyalty Points Engine', sub: 'Award points & unlock tiers', method: 'POST', path: '/api/wati/loyalty/award',
    fields: [{k:'phone',v:'923001234567'},{k:'points',v:'250',type:'number'},{k:'reason',v:'purchase'}] },
  { title: 'NPS Survey Response', sub: 'Record satisfaction score', method: 'POST', path: '/api/wati/nps/respond',
    fields: [{k:'phone',v:'923001234567'},{k:'score',v:'9',type:'number'},{k:'comment',v:'Great service!'}] },
  { title: 'NPS Summary', sub: 'Overall NPS score', method: 'GET', path: '/api/wati/nps/summary',
    fields: [{k:'tenantId',v:'default-tenant',query:true}] },
  { title: 'Birthday/Anniversary Greeter', sub: 'Schedule occasion greeting', method: 'POST', path: '/api/wati/occasions/schedule',
    fields: [{k:'phone',v:'923001234567'},{k:'occasion',type:'select',opts:['birthday','anniversary']},{k:'date',v:'2026-07-01'},{k:'discountCode',v:'BDAY20'}] },
  { title: 'Order Tracking', sub: 'Update delivery status', method: 'POST', path: '/api/wati/orders/track',
    fields: [{k:'orderRef',v:'ORD-1001'},{k:'status',type:'select',opts:['placed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled']},{k:'note',v:'On the way'}] },
  { title: 'Referral Link Generator', sub: 'Trackable referral + reward', method: 'POST', path: '/api/wati/referral/generate',
    fields: [{k:'phone',v:'923001234567'},{k:'rewardPoints',v:'100',type:'number'}] },
  { title: 'Appointment Booking', sub: 'Book a service slot', method: 'POST', path: '/api/wati/bookings/create',
    fields: [{k:'phone',v:'923001234567'},{k:'date',v:'2026-07-01'},{k:'slot',v:'15:00'},{k:'service',v:'consultation'}] },
  { title: 'Smart Contact Auto-Tag', sub: 'Behavior-based tagging', method: 'POST', path: '/api/wati/contacts/auto-tag',
    fields: [{k:'phone',v:'923001234567'}], raw:'signals', rawVal:'{"totalOrders":6,"messages":10,"lastActiveDays":5,"cartValue":12000}' },
  { title: 'CSV Import Validator', sub: 'Validate & de-dupe contacts', method: 'POST', path: '/api/wati/contacts/validate-import',
    fields: [], raw:'contacts', rawVal:'[{"name":"Ali","phone":"923001234567"},{"name":"Bad","phone":"123"}]' },

  { cat: 'Optimization & Quality (Batch 5)' },
  { title: 'A/B Test Creator', sub: 'Create message variant test', method: 'POST', path: '/api/wati/abtest/create',
    fields: [{k:'name',v:'CTA Test'}], raw:'variants', rawVal:'["Buy now & save 10%","Order today, limited stock!"]' },
  { title: 'A/B Test Result', sub: 'Record variant conversion', method: 'POST', path: '/api/wati/abtest/result',
    fields: [{k:'testId',v:'ABT-XXXX'},{k:'variantId',v:'V1'},{k:'converted',type:'select',opts:['true','false']}] },
  { title: 'Best-Time-to-Send', sub: 'Optimal broadcast windows', method: 'GET', path: '/api/wati/send-time/recommend',
    fields: [{k:'segment',v:'students',query:true},{k:'timezone',v:'Asia/Karachi',query:true}] },
  { title: 'Merge-Field Renderer', sub: 'Personalize {{tokens}}', method: 'POST', path: '/api/wati/messages/render',
    fields: [{k:'template',type:'textarea',v:'Hi {{name}}, your order {{orderRef}} is ready!'}], raw:'data', rawVal:'{"name":"Ali","orderRef":"ORD-1001"}' },
  { title: 'Compliance Checker', sub: 'Spam/ban risk pre-check', method: 'POST', path: '/api/wati/compliance/check',
    fields: [{k:'message',type:'textarea',v:'CONGRATULATIONS YOU WON!!! 100% FREE click here now'}] },
  { title: 'Stock Demand Forecaster', sub: 'Days until stockout', method: 'POST', path: '/api/wati/stock/forecast',
    fields: [{k:'productId',v:'AI-PRO-001'},{k:'currentStock',v:'12',type:'number'},{k:'dailySalesAvg',v:'3',type:'number'},{k:'leadTimeDays',v:'3',type:'number'}] },
  { title: 'Customer Health Score', sub: '0-100 RFM + NPS health', method: 'POST', path: '/api/wati/analytics/health-score',
    fields: [{k:'recencyDays',v:'10',type:'number'},{k:'totalOrders',v:'5',type:'number'},{k:'totalSpent',v:'18000',type:'number'},{k:'npsScore',v:'9',type:'number'}] },
];

const grid = document.getElementById('grid');

function el(tag, props={}, html='') { const e=document.createElement(tag); Object.assign(e,props); if(html)e.innerHTML=html; return e; }

FEATURES.forEach((f, i) => {
  if (f.cat) { grid.appendChild(el('div',{className:'cat'},f.cat)); return; }
  const card = el('div',{className:'card'});
  card.appendChild(el('h3',{},f.title));
  card.appendChild(el('div',{className:'sub'},`${f.method} ${f.path}`));

  (f.fields||[]).forEach(fld => {
    card.appendChild(el('label',{},fld.k + (fld.query?' (query)':'')));
    let input;
    if (fld.type === 'textarea') { input = el('textarea'); input.value = fld.v||''; }
    else if (fld.type === 'select') { input = el('select'); (fld.opts||[]).forEach(o=>{const op=el('option',{value:o},o);input.appendChild(op);}); }
    else { input = el('input'); input.type = fld.type||'text'; input.value = fld.v||''; }
    input.dataset.k = fld.k; input.dataset.query = fld.query?'1':''; input.dataset.num = fld.type==='number'?'1':'';
    card.appendChild(input);
  });

  if (f.raw) {
    card.appendChild(el('label',{},f.raw + ' (JSON)'));
    const ta = el('textarea'); ta.value = f.rawVal||''; ta.dataset.raw = f.raw;
    card.appendChild(ta);
  }

  const out = el('pre',{},'Result will appear here…');
  const btn = el('button',{},'Run');
  btn.onclick = () => runFeature(f, card, out, btn);
  card.appendChild(btn);
  card.appendChild(out);
  grid.appendChild(card);
});

async function runFeature(f, card, out, btn) {
  btn.disabled = true; btn.textContent = 'Running…'; out.textContent = '…';
  try {
    let path = f.path;
    const body = {};
    const qs = [];
    card.querySelectorAll('input,textarea,select').forEach(inp => {
      if (inp.dataset.raw) { try { body[inp.dataset.raw] = JSON.parse(inp.value); } catch { body[inp.dataset.raw] = inp.value; } return; }
      if (!inp.dataset.k) return;
      let val = inp.value;
      if (inp.dataset.num === '1') val = Number(val);
      if (inp.dataset.query === '1') { qs.push(`${inp.dataset.k}=${encodeURIComponent(inp.value)}`); }
      else body[inp.dataset.k] = val;
    });
    if (qs.length) path += (path.includes('?')?'&':'?') + qs.join('&');

    const opts = { method: f.method, headers: {'Content-Type':'application/json'} };
    if (f.method !== 'GET') opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    const data = await r.json();
    out.innerHTML = `<span class="${data.success===false?'err':'ok'}">${r.status} ${r.ok?'OK':'ERR'}</span>\n` + JSON.stringify(data, null, 2);
  } catch (e) {
    out.innerHTML = `<span class="err">Request failed:</span> ${e.message}`;
  } finally {
    btn.disabled = false; btn.textContent = 'Run';
  }
}
