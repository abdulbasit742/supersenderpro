// ============================================================
// Real Estate Bot - WhatsApp tenant bot
// Features: search, post property, valuation, agent contact,
// latest listings, visit booking, tenant-aware sessions.
// ============================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const reSessions = new Map();

function safeTenantId(value = 'default') {
  const raw = String(value || 'default').trim();
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'default';
}

function dataPath(name) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, name);
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function loadProperties(tenantId = 'default') {
  return readJSON(dataPath(`re_properties_${safeTenantId(tenantId)}.json`), []);
}

function saveProperties(properties, tenantId = 'default') {
  writeJSON(dataPath(`re_properties_${safeTenantId(tenantId)}.json`), Array.isArray(properties) ? properties : []);
}

function loadTenants() {
  return readJSON(dataPath('re_tenants.json'), []);
}

function loadTenantConfig(tenantId = 'default') {
  const id = safeTenantId(tenantId);
  const direct = readJSON(dataPath(`re_tenant_${id}.json`), null);
  if (direct) return direct;
  return loadTenants().find(t => t.tenantId === id) || null;
}

function normalizeNumber(value = '') {
  return String(value || '').replace(/\D/g, '');
}

function localPhoneVariants(value = '') {
  const digits = normalizeNumber(value);
  const variants = new Set([digits]);
  if (digits.startsWith('92') && digits.length >= 12) variants.add(`0${digits.slice(2)}`);
  if (digits.startsWith('0') && digits.length >= 11) variants.add(`92${digits.slice(1)}`);
  if (digits.startsWith('3') && digits.length === 10) {
    variants.add(`0${digits}`);
    variants.add(`92${digits}`);
  }
  return [...variants].filter(Boolean);
}

function detectTenantByNumber(number = '') {
  const variants = localPhoneVariants(number);
  return loadTenants().find(t => {
    const all = [
      t.phone,
      t.whatsappNumber,
      t.agentNumber,
      t.adminNumber,
      t.ownerPhone
    ].flatMap(localPhoneVariants);
    return all.some(v => variants.includes(v));
  }) || null;
}

function tenantFromText(text = '') {
  const match = String(text || '').trim().match(/^(?:re|realestate|real-estate|property|tenant)\s+([a-zA-Z0-9_-]+)/i);
  return match ? safeTenantId(match[1]) : '';
}

function stripTenantCommand(text = '') {
  return String(text || '').trim().replace(/^(?:re|realestate|real-estate|property|tenant)\s+[a-zA-Z0-9_-]+\s*/i, '').trim();
}

function sessionKey(userId, tenantId) {
  return `${safeTenantId(tenantId)}:${userId}`;
}

function getRESession(userId, tenantId = 'default') {
  const key = sessionKey(userId, tenantId);
  if (!reSessions.has(key)) reSessions.set(key, { state: 'idle', data: {}, lastActivity: Date.now() });
  const session = reSessions.get(key);
  session.lastActivity = Date.now();
  return session;
}

function setREState(userId, tenantId, state, data = {}) {
  reSessions.set(sessionKey(userId, tenantId), { state, data, lastActivity: Date.now() });
}

setInterval(() => {
  const cutoff = Date.now() - 45 * 60 * 1000;
  for (const [key, session] of reSessions.entries()) {
    if ((session.lastActivity || 0) < cutoff) reSessions.delete(key);
  }
}, 30 * 60 * 1000).unref();

function getMainMenu(config = {}) {
  const name = config.businessName || config.business_name || 'Real Estate';
  const city = config.city || 'Pakistan';
  return `🏠 *${name}*
📍 ${city}
━━━━━━━━━━━━━━━━━━━━━━

Assalam o Alaikum! Khush aamdeed 🌟

*1* → 🔍 Property Dhundein (Buy/Rent)
*2* → 📋 Apni Property Post Karein
*3* → 💰 Price Check / Valuation
*4* → 📞 Agent Se Baat Karein
*5* → 🏘️ Latest Listings
*6* → 📅 Site Visit Book Karein

Seedha bhi likh saktay hain:
_"5 marla house for sale Rawalpindi"_
_"1 kanal plot rent Islamabad"_`;
}

const PROPERTY_TYPE_MENU = `🏠 *Property Type Select Karein:*
━━━━━━━━━━━━━━━━━━━━━━

*1* → 🏠 House
*2* → 🏢 Apartment / Flat
*3* → 🏗️ Plot / Land
*4* → 🏪 Commercial / Shop / Office
*5* → 🏨 Farmhouse / Villa
*6* → 🌐 Koi bhi

*0* → 🔙 Back`;

const PURPOSE_MENU = `💼 *Maqsad Batayein:*

*1* → 🛒 Kharidna Chahta Hoon (Buy)
*2* → 🏠 Kiraye Par Lena (Rent)

*0* → 🔙 Back`;

const SIZE_MENU = `📐 *Size Select Karein:*
━━━━━━━━━━━━━━━━━━━━━━

*1* → 3 Marla
*2* → 5 Marla
*3* → 7 Marla
*4* → 10 Marla
*5* → 1 Kanal
*6* → 2 Kanal+
*7* → Custom / Koi bhi

*0* → 🔙 Back`;

function parsePrice(text = '') {
  const raw = String(text || '').toLowerCase().replace(/,/g, '');
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(crore|cr|karor|lakh|lac|k|thousand)?/i);
  if (!match) return 0;
  const num = Number(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (unit.includes('crore') || unit === 'cr' || unit.includes('karor')) return Math.round(num * 10000000);
  if (unit.includes('lakh') || unit === 'lac') return Math.round(num * 100000);
  if (unit === 'k' || unit.includes('thousand')) return Math.round(num * 1000);
  return Math.round(num);
}

function parseSizeMarla(text = '') {
  const q = String(text || '').toLowerCase();
  const kanal = q.match(/(\d+(?:\.\d+)?)\s*kanal/);
  if (kanal) return Math.round(Number(kanal[1]) * 20);
  const marla = q.match(/(\d+(?:\.\d+)?)\s*marla/);
  if (marla) return Number(marla[1]);
  return 0;
}

function inferType(text = '') {
  const q = String(text || '').toLowerCase();
  if (/(plot|land|zameen|file)/.test(q)) return 'plot';
  if (/(flat|apartment|portion)/.test(q)) return 'apartment';
  if (/(shop|commercial|office|plaza)/.test(q)) return 'commercial';
  if (/(farm|villa|farmhouse)/.test(q)) return 'farmhouse';
  return 'house';
}

function inferPurpose(text = '') {
  const q = String(text || '').toLowerCase();
  if (/(rent|kiraya|lease)/.test(q)) return 'rent';
  return 'sale';
}

function inferCity(text = '') {
  const q = String(text || '').toLowerCase();
  const cities = ['rawalpindi', 'islamabad', 'lahore', 'karachi', 'peshawar', 'multan', 'faisalabad', 'gujranwala', 'sialkot'];
  return cities.find(city => q.includes(city)) || '';
}

function propertySearchScore(property, query) {
  const q = String(query || '').toLowerCase();
  const haystack = [
    property.title,
    property.area,
    property.city,
    property.type,
    property.purpose,
    property.size,
    property.features
  ].flat().filter(Boolean).join(' ').toLowerCase();
  let score = 0;

  if (/(buy|sale|kharid|for sale)/.test(q) && property.purpose === 'sale') score += 3;
  if (/(rent|kiraya|lease)/.test(q) && property.purpose === 'rent') score += 3;

  const type = inferType(q);
  if (type && property.type === type) score += 2;

  const city = inferCity(q);
  if (city && String(property.city || '').toLowerCase().includes(city)) score += 3;
  if (property.area && q.includes(String(property.area).toLowerCase())) score += 3;

  const querySize = parseSizeMarla(q);
  if (querySize && Number(property.sizeMarla || 0) === querySize) score += 2;

  const terms = q.split(/\s+/).filter(t => t.length > 2);
  terms.forEach(term => {
    if (haystack.includes(term)) score += 1;
  });
  return score;
}

function searchProperties(query, tenantId = 'default') {
  const q = String(query || '').toLowerCase();
  const maxBudget = parsePrice(q);
  return loadProperties(tenantId)
    .filter(p => p.status !== 'deleted' && p.status !== 'pending_review')
    .map(p => ({ ...p, _score: propertySearchScore(p, q) }))
    .filter(p => {
      if (maxBudget && Number(p.price || 0) > maxBudget * 1.2) return false;
      return p._score > 0;
    })
    .sort((a, b) => b._score - a._score || Number(a.price || 0) - Number(b.price || 0))
    .slice(0, 5);
}

function formatPrice(price) {
  const value = Number(price || 0);
  if (!value) return 'Contact for Price';
  if (value >= 10000000) return `${(value / 10000000).toFixed(value % 10000000 ? 1 : 0)} Crore`;
  if (value >= 100000) return `${(value / 100000).toFixed(value % 100000 ? 1 : 0)} Lakh`;
  return `Rs. ${value.toLocaleString()}`;
}

function formatProperty(p, i = 0) {
  const purpose = p.purpose === 'rent' ? '🏠 Rent' : '🛒 Sale';
  const icon = { house: '🏠', apartment: '🏢', plot: '🏗️', commercial: '🏪', farmhouse: '🏨' }[p.type] || '🏠';
  const bedBath = [p.bedrooms ? `${p.bedrooms} Bed` : '', p.bathrooms ? `${p.bathrooms} Bath` : ''].filter(Boolean).join(' | ');
  const features = Array.isArray(p.features) ? p.features.join(' | ') : (p.features || '');
  return `${icon} *${i + 1}. ${p.title || 'Property'}*
📍 ${[p.area, p.city].filter(Boolean).join(', ') || 'Location on request'}
📐 Size: ${p.sizeMarla ? `${p.sizeMarla} Marla` : p.size || 'N/A'}
${bedBath ? `🛏️ ${bedBath}\n` : ''}💰 Price: *${formatPrice(p.price)}* ${purpose}
${features ? `✅ ${features}\n` : ''}📞 Contact: ${p.contactNumber || p.agentNumber || 'Reply "agent" for contact'}
${p.image ? `🖼️ ${p.image}\n` : ''}ID: *${p.id || '-'}*`;
}

function naturalSearch(text = '') {
  return ['marla', 'kanal', 'house', 'plot', 'flat', 'apartment', 'rent', 'sale', 'buy', 'ghar', 'makan', 'zameen', 'lakh', 'crore', 'dha', 'bahria']
    .some(k => String(text || '').toLowerCase().includes(k));
}

function propertyTypeFromChoice(text) {
  return ({ '1': 'house', '2': 'apartment', '3': 'plot', '4': 'commercial', '5': 'farmhouse', '6': 'any' })[String(text || '').trim()] || inferType(text);
}

function sizeFromChoice(text) {
  return ({
    '1': { size: '3 Marla', sizeMarla: 3 },
    '2': { size: '5 Marla', sizeMarla: 5 },
    '3': { size: '7 Marla', sizeMarla: 7 },
    '4': { size: '10 Marla', sizeMarla: 10 },
    '5': { size: '1 Kanal', sizeMarla: 20 },
    '6': { size: '2 Kanal+', sizeMarla: 40 },
    '7': { size: 'Custom', sizeMarla: 0 }
  })[String(text || '').trim()] || { size: text, sizeMarla: parseSizeMarla(text) };
}

async function handlePostProperty(userId, text, session, tenantId) {
  const step = session.data.postStep || 'type';
  if (step === 'type') {
    setREState(userId, tenantId, 'post_property', { postStep: 'purpose', type: propertyTypeFromChoice(text) });
    return { replies: [PURPOSE_MENU] };
  }
  if (step === 'purpose') {
    const purpose = text === '2' ? 'rent' : 'sale';
    setREState(userId, tenantId, 'post_property', { ...session.data, postStep: 'title', purpose });
    return { replies: ['📝 *Property ka title likhein:*\n\nExample: _5 Marla House DHA Phase 2 Rawalpindi_'] };
  }
  if (step === 'title') {
    setREState(userId, tenantId, 'post_property', { ...session.data, postStep: 'area', title: text });
    return { replies: ['📍 *Area / Society ka naam likhein:*\nExample: _DHA Phase 2, Bahria Town, Gulshan-e-Iqbal_'] };
  }
  if (step === 'area') {
    setREState(userId, tenantId, 'post_property', { ...session.data, postStep: 'city', area: text });
    return { replies: ['🏙️ *City likhein:*\nExample: _Rawalpindi_, _Lahore_, _Karachi_'] };
  }
  if (step === 'city') {
    setREState(userId, tenantId, 'post_property', { ...session.data, postStep: 'size', city: text });
    return { replies: [SIZE_MENU] };
  }
  if (step === 'size') {
    const size = sizeFromChoice(text);
    setREState(userId, tenantId, 'post_property', { ...session.data, postStep: 'price', ...size });
    return { replies: ['💰 *Price likhein:*\nExample: _50 lakh_ ya _1.5 crore_ ya _25000 rent_'] };
  }
  if (step === 'price') {
    setREState(userId, tenantId, 'post_property', { ...session.data, postStep: 'contact', priceText: text, price: parsePrice(text) });
    return { replies: ['📞 *Apna contact number likhein:*\nExample: _03001234567_'] };
  }
  if (step === 'contact') {
    const newProp = {
      id: `re_${Date.now()}`,
      tenantId,
      title: session.data.title,
      area: session.data.area,
      city: session.data.city || inferCity(session.data.title) || 'Pakistan',
      type: session.data.type || 'house',
      purpose: session.data.purpose || 'sale',
      size: session.data.size,
      sizeMarla: session.data.sizeMarla || parseSizeMarla(session.data.size),
      price: session.data.price || parsePrice(session.data.priceText),
      priceText: session.data.priceText,
      contactNumber: text,
      postedBy: userId,
      postedAt: new Date().toISOString(),
      status: 'pending_review'
    };
    const properties = loadProperties(tenantId);
    properties.push(newProp);
    saveProperties(properties, tenantId);
    setREState(userId, tenantId, 'idle');
    return {
      replies: [`✅ *Property Post Ho Gayi!*

📋 *Details:*
📌 ${newProp.title}
📍 ${newProp.area}, ${newProp.city}
📐 ${newProp.size}
💰 ${newProp.priceText}
📞 ${newProp.contactNumber}

⏳ Admin review ke baad live ho jaayegi.
ID: *${newProp.id}*

*menu* → Main Menu`]
    };
  }
  setREState(userId, tenantId, 'idle');
  return { replies: [getMainMenu(loadTenantConfig(tenantId) || {})] };
}

function saveVisit(tenantId, visitData) {
  const file = dataPath(`re_visits_${safeTenantId(tenantId)}.json`);
  const visits = readJSON(file, []);
  visits.push(visitData);
  writeJSON(file, visits);
}

async function handleRealEstateText({ userId, text, tenantId = 'default', name = '' }) {
  const safeTenant = safeTenantId(tenantId);
  const message = String(text || '').trim();
  const clean = stripTenantCommand(message) || message;
  const lower = clean.toLowerCase();
  const config = loadTenantConfig(safeTenant) || {};
  const session = getRESession(userId, safeTenant);

  if (['menu', 'start', 'hi', 'hello', 'salam', 'back', '0'].includes(lower)) {
    setREState(userId, safeTenant, 'idle');
    return { replies: [getMainMenu(config)], tenantId: safeTenant };
  }

  // Live Sentiment & Agent Escalation Integration
  let sentimentTag = 'neutral';
  try {
    const SentimentAnalyzer = require('../ai/sentimentAnalyzer');
    const analyzer = new SentimentAnalyzer(DATA_DIR, config);
    const analysis = await analyzer.recordSentiment(userId, clean, 'inbound');
    sentimentTag = analysis.sentiment;
    if (analysis.sentiment === 'negative') {
      console.log(`[Escalation] Negative sentiment detected for user: ${userId}. Routing to real agent.`);
      const agentNum = config.agentNumber || config.ownerPhone || config.phone || 'N/A';
      return {
        replies: [
          `⚠️ *Urgent Escalation* ⚠️\n\nAssalam o Alaikum! Hamein khushi nahi hui aap ki pareshani sun kar. Hum ne direct human agent ko notify kar diya hai.\n\n👤 Agent: ${config.agentName || 'Senior Support Agent'}\n📱 Rabta: ${agentNum}\n\nJald se jald direct contact kiya jayega.`,
          getMainMenu(config)
        ],
        adminAlert: `🚨 *Negative Sentiment Real Estate Enquiry!*\n👤 User: ${name || 'Customer'} (${userId})\n💬 Msg: "${clean}"\n📌 Action: Escalated to human agent.`,
        tenantId: safeTenant
      };
    }
  } catch (err) {
    console.error('[RealEstateBot] Failed to analyze sentiment:', err.message);
  }

  if (session.state === 'idle') {

    if (naturalSearch(clean)) {
      const results = searchProperties(clean, safeTenant);
      if (!results.length) {
        return { replies: [`❌ *Koi property nahi mili*\n\nQuery change karein:\n_5 marla house for sale Rawalpindi_\n_1 kanal plot rent Islamabad_\n\n*menu* → Main Menu`], tenantId: safeTenant };
      }
      return {
        replies: [`🔍 *${results.length} Properties Mili:*\n━━━━━━━━━━━━━━━━━━━━━━\n\n${results.map(formatProperty).join('\n\n---\n\n')}\n\n📞 Visit book karne ke liye *visit* type karein.\n*menu* → Main Menu`],
        tenantId: safeTenant
      };
    }
    if (clean === '1') {
      setREState(userId, safeTenant, 'search', { step: 'purpose' });
      return { replies: [PURPOSE_MENU], tenantId: safeTenant };
    }
    if (clean === '2') {
      setREState(userId, safeTenant, 'post_property', { postStep: 'type' });
      return { replies: [PROPERTY_TYPE_MENU], tenantId: safeTenant };
    }
    if (clean === '3') {
      setREState(userId, safeTenant, 'valuation');
      return { replies: ['💰 *Price Check / Valuation*\n\nApni property ki details likhein:\nExample: _5 marla house DHA Rawalpindi 2023_\n\n*0* → Back'], tenantId: safeTenant };
    }
    if (clean === '4' || lower.includes('agent')) {
      const agentNum = config.agentNumber || config.ownerPhone || config.phone || 'N/A';
      return { replies: [`📞 *Agent Se Baat Karein*\n━━━━━━━━━━━━━━━━━━━━━━\n\n👤 Agent: ${config.agentName || config.ownerName || 'Our Agent'}\n📱 Number: ${agentNum}\n⏰ Available: 9 AM - 9 PM\n\n*menu* → Main Menu`], tenantId: safeTenant };
    }
    if (clean === '5') {
      const latest = loadProperties(safeTenant).filter(p => p.status !== 'pending_review' && p.status !== 'deleted').slice(-5).reverse();
      if (!latest.length) return { replies: ['📋 *Abhi koi active listing nahi hai.*\n\nApni property post karne ke liye *2* dabayein.\n\n*menu* → Main Menu'], tenantId: safeTenant };
      return { replies: [`🏘️ *Latest Listings:*\n━━━━━━━━━━━━━━━━━━━━━━\n\n${latest.map(formatProperty).join('\n\n---\n\n')}\n\n*menu* → Main Menu`], tenantId: safeTenant };
    }
    if (clean === '6' || lower.includes('visit') || lower.includes('appointment')) {
      setREState(userId, safeTenant, 'book_visit', { step: 'property' });
      return { replies: ['📅 *Site Visit Book Karein*\n\nKaunsi property dekhna chahte hain?\nProperty ID ya naam likhein:\n\n*0* → Back'], tenantId: safeTenant };
    }
    return { replies: [getMainMenu(config)], tenantId: safeTenant };
  }

  if (session.state === 'search') {
    if (session.data.step === 'purpose') {
      setREState(userId, safeTenant, 'search', { step: 'type', purpose: clean === '2' ? 'rent' : 'sale' });
      return { replies: [PROPERTY_TYPE_MENU], tenantId: safeTenant };
    }
    if (session.data.step === 'type') {
      setREState(userId, safeTenant, 'search', { ...session.data, step: 'area', type: propertyTypeFromChoice(clean) });
      return { replies: ['📍 *City / Area likhein:*\nExample: _Rawalpindi_, _DHA Lahore_, _Bahria Karachi_\n\n*0* → Back'], tenantId: safeTenant };
    }
    if (session.data.step === 'area') {
      const query = `${session.data.purpose || ''} ${session.data.type || ''} ${clean}`;
      const results = searchProperties(query, safeTenant);
      setREState(userId, safeTenant, 'idle');
      if (!results.length) return { replies: [`❌ *${clean} mein koi property nahi mili*\n\nDosri area try karein ya agent se rabta karein.\n\n*menu* → Main Menu`], tenantId: safeTenant };
      return { replies: [`🔍 *${results.length} Properties:*\n━━━━━━━━━━━━━━━━━━━━━━\n\n${results.map(formatProperty).join('\n\n---\n\n')}\n\n*menu* → Main Menu`], tenantId: safeTenant };
    }
  }

  if (session.state === 'post_property') {
    return { ...(await handlePostProperty(userId, clean, session, safeTenant)), tenantId: safeTenant };
  }

  if (session.state === 'book_visit') {
    if (session.data.step === 'property') {
      setREState(userId, safeTenant, 'book_visit', { step: 'date', property: clean });
      return { replies: ['📅 *Kab visit karna chahte hain?*\nExample: _Kal duphar 2 baje_ ya _Itwar subah_\n\n*0* → Back'], tenantId: safeTenant };
    }
    if (session.data.step === 'date') {
      setREState(userId, safeTenant, 'book_visit', { ...session.data, step: 'name', date: clean });
      return { replies: ['👤 *Apna naam likhein:*'], tenantId: safeTenant };
    }
    if (session.data.step === 'name') {
      const visitData = {
        property: session.data.property,
        date: session.data.date,
        name: clean || name || 'Customer',
        phone: userId,
        tenantId: safeTenant,
        bookedAt: new Date().toISOString()
      };
      saveVisit(safeTenant, visitData);
      setREState(userId, safeTenant, 'idle');
      return {
        replies: [`✅ *Visit Book Ho Gayi!*

👤 Naam: ${visitData.name}
🏠 Property: ${visitData.property}
📅 Date: ${visitData.date}

Hamara agent aap se confirm karega.

*menu* → Main Menu`],
        adminAlert: `📅 *New Real Estate Visit Booking!*\n\nAgency: ${config.businessName || safeTenant}\n👤 ${visitData.name}\n📱 ${userId}\n🏠 Property: ${visitData.property}\n📅 Date: ${visitData.date}`,
        tenantId: safeTenant
      };
    }
  }

  if (session.state === 'valuation') {
    setREState(userId, safeTenant, 'idle');
    const approximate = parsePrice(clean) || 0;
    const estimate = approximate ? `\nRough value around *${formatPrice(approximate)}* se compare karein.` : '';
    return { replies: [`💰 *Approximate Valuation*\n\nQuery: _${clean}_${estimate}\n\n⚠️ Yeh rough estimate hai. Exact valuation ke liye agent se rabta karein.\n📞 Agent: ${config.agentNumber || config.phone || 'Contact Admin'}\n\n*menu* → Main Menu`], tenantId: safeTenant };
  }

  setREState(userId, safeTenant, 'idle');
  return { replies: [getMainMenu(config)], tenantId: safeTenant };
}

async function handleRealEstateMessage(msg, tenantId = 'default') {
  const result = await handleRealEstateText({
    userId: msg.from,
    text: msg.body,
    tenantId,
    name: msg._data?.notifyName || msg.notifyName || ''
  });
  for (const reply of result.replies || []) await msg.reply(reply);
  return result;
}

module.exports = {
  detectTenantByNumber,
  formatProperty,
  getMainMenu,
  handleRealEstateMessage,
  handleRealEstateText,
  loadProperties,
  loadTenantConfig,
  saveProperties,
  searchProperties,
  tenantFromText
};
