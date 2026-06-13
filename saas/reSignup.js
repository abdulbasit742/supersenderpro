// ============================================================
// Real Estate tenant self sign-up + dashboard APIs.
// Mounted as app.use('/api', router)
// ============================================================

const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');

function dataPath(name) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, name);
}

function safeTenantId(value = 'default') {
  return String(value || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'default';
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

function loadTenants() {
  return readJSON(dataPath('re_tenants.json'), []);
}

function saveTenants(tenants) {
  writeJSON(dataPath('re_tenants.json'), tenants);
}

function loadTenant(tenantId) {
  const id = safeTenantId(tenantId);
  return loadTenants().find(t => t.tenantId === id) || null;
}

function normalizeNumber(value = '') {
  return String(value || '').replace(/\D/g, '');
}

function normalizePakistanNumber(value = '') {
  let digits = normalizeNumber(value);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `92${digits.slice(1)}`;
  if (digits.startsWith('3') && digits.length === 10) digits = `92${digits}`;
  return digits;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function publicTenant(tenant) {
  if (!tenant) return null;
  const { passwordHash, token, ...safe } = tenant;
  return safe;
}

function tenantFile(tenantId) {
  return dataPath(`re_tenant_${safeTenantId(tenantId)}.json`);
}

function propFile(tenantId) {
  return dataPath(`re_properties_${safeTenantId(tenantId)}.json`);
}

function visitFile(tenantId) {
  return dataPath(`re_visits_${safeTenantId(tenantId)}.json`);
}

function authTenant(req, res, next) {
  const token = req.headers['x-tenant-token'] || req.query.token;
  const tenantId = req.params.tenantId || req.body?.tenantId || req.query.tenantId;
  if (!token || !tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const tenant = loadTenant(tenantId);
  if (!tenant || tenant.token !== token) return res.status(401).json({ error: 'Invalid token' });
  req.tenant = tenant;
  next();
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlTag(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'),
    new RegExp(`<[^:>]+:${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/[^:>]+:${escaped}>`, 'i')
  ];
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match) return stripHtml(match[1]);
  }
  return '';
}

function xmlAttr(block, tag, attr) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<${escaped}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const match = block.match(pattern);
  return match ? stripHtml(match[1]) : '';
}

function parsePrice(text = '') {
  const raw = String(text || '').toLowerCase().replace(/,/g, '');
  const match = raw.match(/(?:rs\.?|pkr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|karor|lakh|lac|million|k|thousand)?/i);
  if (!match) return 0;
  const num = Number(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (unit.includes('crore') || unit === 'cr' || unit.includes('karor')) return Math.round(num * 10000000);
  if (unit.includes('lakh') || unit === 'lac') return Math.round(num * 100000);
  if (unit.includes('million')) return Math.round(num * 1000000);
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
  if (/(plot|land|file|zameen)/.test(q)) return 'plot';
  if (/(flat|apartment|portion)/.test(q)) return 'apartment';
  if (/(shop|commercial|office|plaza)/.test(q)) return 'commercial';
  if (/(farmhouse|villa|farm)/.test(q)) return 'farmhouse';
  return 'house';
}

function inferPurpose(text = '') {
  return /(rent|kiraya|lease)/i.test(text) ? 'rent' : 'sale';
}

function inferCity(text = '') {
  const lower = String(text || '').toLowerCase();
  return ['rawalpindi', 'islamabad', 'lahore', 'karachi', 'peshawar', 'multan', 'faisalabad', 'gujranwala', 'sialkot']
    .find(city => lower.includes(city)) || '';
}

function itemBlocks(xml = '') {
  const blocks = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml))) blocks.push(match[0]);
  if (blocks.length) return blocks;
  const entryRegex = /<entry\b[\s\S]*?<\/entry>/gi;
  while ((match = entryRegex.exec(xml))) blocks.push(match[0]);
  return blocks;
}

function propertyFromFeedItem(block, tenantId, index = 0, tenant = {}) {
  const title = xmlTag(block, 'title') || `Property ${index + 1}`;
  const description = xmlTag(block, 'description') || xmlTag(block, 'summary') || xmlTag(block, 'content');
  const link = xmlTag(block, 'link') || xmlAttr(block, 'link', 'href');
  const image = xmlTag(block, 'image') || xmlTag(block, 'image_link') || xmlTag(block, 'thumbnail') || xmlAttr(block, 'enclosure', 'url');
  const combined = `${title} ${description}`;
  const price = parsePrice(xmlTag(block, 'price') || xmlTag(block, 'amount') || combined);
  const city = inferCity(combined) || tenant.city || 'Pakistan';
  const sizeMarla = parseSizeMarla(combined);
  const bedrooms = Number((combined.match(/(\d+)\s*(bed|bedroom)/i) || [])[1] || 0);
  const bathrooms = Number((combined.match(/(\d+)\s*(bath|bathroom)/i) || [])[1] || 0);

  return {
    id: `re_rss_${Date.now()}_${index}`,
    tenantId,
    title,
    description: stripHtml(description).slice(0, 700),
    area: '',
    city,
    type: inferType(combined),
    purpose: inferPurpose(combined),
    size: sizeMarla ? `${sizeMarla} Marla` : '',
    sizeMarla,
    bedrooms,
    bathrooms,
    price,
    contactNumber: tenant.agentNumber || tenant.phone || '',
    image,
    link,
    source: 'rss',
    status: 'active',
    createdAt: new Date().toISOString()
  };
}

function resolveFeedUrl(candidate, baseUrl) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return '';
  }
}

function htmlAttr(tag = '', attr = '') {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(tag || '').match(new RegExp(`\\s${escaped}=["']([^"']+)["']`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function feedCandidatesFromHTML(html = '', sourceUrl = '') {
  const candidates = [];
  const linkRegex = /<link\b[^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html))) {
    const tag = match[0];
    const rel = htmlAttr(tag, 'rel').toLowerCase();
    const type = htmlAttr(tag, 'type').toLowerCase();
    const href = htmlAttr(tag, 'href');
    if (!href) continue;
    const looksLikeFeed = rel.includes('alternate') && /(rss|atom|xml)/i.test(type + ' ' + href);
    if (looksLikeFeed) candidates.push(resolveFeedUrl(href, sourceUrl));
  }
  candidates.push(...commonFeedCandidates(sourceUrl));
  return [...new Set(candidates.filter(Boolean))];
}

function commonFeedCandidates(sourceUrl = '') {
  try {
    const base = new URL(sourceUrl);
    return [
      resolveFeedUrl('/feed/', base.origin),
      resolveFeedUrl('/?feed=rss2', base.origin),
      resolveFeedUrl('/rss/', base.origin),
      resolveFeedUrl('/atom.xml', base.origin),
      resolveFeedUrl('/feed.xml', base.origin)
    ].filter(Boolean);
  } catch {
    return [];
  }
}

async function axiosGetWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      lastError = error;
      if (!['EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code) && !String(error.message || '').includes('timeout')) break;
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchRSSDocument(rssUrl) {
  if (!rssUrl) throw new Error('rssUrl is required');
  const tried = [];
  const errors = [];
  const queue = [rssUrl, ...commonFeedCandidates(rssUrl)];
  while (queue.length) {
    const candidate = queue.shift();
    if (!candidate || tried.includes(candidate)) continue;
    tried.push(candidate);
    let response;
    try {
      response = await axiosGetWithRetry(candidate, {
        timeout: 15000,
        headers: { 'User-Agent': 'SuperSenderPro-RealEstateBot/1.0' }
      });
    } catch (error) {
      errors.push(`${candidate}: ${error.code || error.message}`);
      continue;
    }
    const body = String(response.data || '');
    if (itemBlocks(body).length) return { xml: body, url: candidate, tried };
    if (/<html\b/i.test(body)) {
      for (const feedUrl of feedCandidatesFromHTML(body, candidate)) {
        if (!tried.includes(feedUrl)) queue.push(feedUrl);
      }
    }
  }
  const suffix = errors.length ? ` Last errors: ${errors.slice(-3).join(' | ')}` : '';
  throw new Error(`No RSS/Atom items found. Tried: ${tried.slice(0, 5).join(', ')}${suffix}`);
}

async function importPropertiesFromRSS(tenantId, rssUrl, tenant, options = {}) {
  const { xml, url: resolvedUrl } = await fetchRSSDocument(rssUrl);
  const blocks = itemBlocks(xml);

  const existing = readJSON(propFile(tenantId), []);
  const seen = new Set(existing.map(p => (p.link || p.title || '').toLowerCase()));
  let added = 0;
  const imported = [];
  for (const [index, block] of blocks.entries()) {
    const prop = propertyFromFeedItem(block, tenantId, index, tenant);
    const key = (prop.link || prop.title || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    if (options.status) prop.status = options.status;
    existing.push(prop);
    seen.add(key);
    imported.push(prop);
    added += 1;
  }
  writeJSON(propFile(tenantId), existing);
  return { added, total: existing.length, imported, sourceUrl: resolvedUrl };
}

router.post('/re/signup', async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      phone,
      email,
      city,
      whatsappNumber,
      agentName,
      agentNumber,
      plan = 'starter',
      password
    } = req.body || {};

    if (!businessName || !phone || !password) {
      return res.status(400).json({ error: 'businessName, phone aur password zaroori hain' });
    }

    const normalizedPhone = normalizePakistanNumber(phone);
    const normalizedWa = normalizePakistanNumber(whatsappNumber || phone);
    const tenants = loadTenants();
    const exists = tenants.find(t => normalizePakistanNumber(t.phone) === normalizedPhone || normalizePakistanNumber(t.whatsappNumber) === normalizedWa);
    if (exists) return res.status(409).json({ error: 'Is number se pehle se account hai' });

    const tenantId = safeTenantId(`re_${Date.now()}_${normalizedPhone.slice(-4)}`);
    const token = generateToken();
    const passwordHash = await bcrypt.hash(String(password), 10);
    const tenant = {
      tenantId,
      token,
      passwordHash,
      businessName,
      ownerName: ownerName || businessName,
      phone: normalizedPhone,
      email: email || '',
      city: city || 'Pakistan',
      whatsappNumber: normalizedWa,
      agentName: agentName || ownerName || businessName,
      agentNumber: normalizePakistanNumber(agentNumber || phone),
      adminNumber: `${normalizedPhone}@c.us`,
      plan,
      status: 'active',
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      propertyCount: 0,
      botEnabled: true
    };

    tenants.push(tenant);
    saveTenants(tenants);
    writeJSON(tenantFile(tenantId), tenant);
    writeJSON(propFile(tenantId), []);
    writeJSON(visitFile(tenantId), []);

    res.json({
      success: true,
      message: 'Account ban gaya! Dashboard access karein.',
      tenantId,
      token,
      dashboardUrl: `/re-dashboard.html?tenant=${tenantId}&token=${token}`,
      botStartText: `RE ${tenantId}`,
      botLink: `/api/re/wa-link/${tenantId}?token=${token}`,
      tenant: publicTenant(tenant)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/re/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: 'Phone aur password chahiye' });
    const normalizedPhone = normalizePakistanNumber(phone);
    const tenants = loadTenants();
    const tenant = tenants.find(t => normalizePakistanNumber(t.phone) === normalizedPhone || normalizePakistanNumber(t.whatsappNumber) === normalizedPhone);
    if (!tenant) return res.status(404).json({ error: 'Account nahi mila' });
    const ok = await bcrypt.compare(String(password), tenant.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Password galat hai' });
    tenant.token = generateToken();
    tenant.lastLogin = new Date().toISOString();
    saveTenants(tenants);
    writeJSON(tenantFile(tenant.tenantId), tenant);
    res.json({
      success: true,
      tenantId: tenant.tenantId,
      token: tenant.token,
      dashboardUrl: `/re-dashboard.html?tenant=${tenant.tenantId}&token=${tenant.token}`,
      tenant: publicTenant(tenant)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/re/dashboard/:tenantId', authTenant, (req, res) => {
  const tenantId = safeTenantId(req.params.tenantId);
  const properties = readJSON(propFile(tenantId), []);
  const visits = readJSON(visitFile(tenantId), []);
  res.json({
    success: true,
    tenant: publicTenant(req.tenant),
    stats: {
      totalProperties: properties.length,
      activeListings: properties.filter(p => p.status !== 'pending_review' && p.status !== 'deleted').length,
      pendingReview: properties.filter(p => p.status === 'pending_review').length,
      totalVisits: visits.length,
      recentVisits: visits.slice(-5).reverse()
    },
    recentProperties: properties.slice(-10).reverse()
  });
});

router.get('/re/properties/:tenantId', authTenant, (req, res) => {
  res.json({ success: true, properties: readJSON(propFile(req.params.tenantId), []) });
});

router.post('/re/properties/:tenantId', authTenant, (req, res) => {
  const tenantId = safeTenantId(req.params.tenantId);
  const properties = readJSON(propFile(tenantId), []);
  const body = req.body || {};
  const property = {
    id: body.id || `re_${Date.now()}`,
    tenantId,
    title: body.title || 'Property',
    area: body.area || '',
    city: body.city || req.tenant.city || 'Pakistan',
    type: body.type || inferType(body.title || ''),
    purpose: body.purpose || inferPurpose(body.title || ''),
    size: body.size || '',
    sizeMarla: Number(body.sizeMarla || parseSizeMarla(body.size || body.title || '')),
    bedrooms: Number(body.bedrooms || 0),
    bathrooms: Number(body.bathrooms || 0),
    price: Number(body.price || parsePrice(body.priceText || body.title || '')),
    features: Array.isArray(body.features) ? body.features : String(body.features || '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean),
    contactNumber: body.contactNumber || req.tenant.agentNumber || req.tenant.phone,
    image: body.image || '',
    link: body.link || '',
    status: body.status || 'active',
    source: body.source || 'manual',
    createdAt: new Date().toISOString()
  };
  properties.push(property);
  writeJSON(propFile(tenantId), properties);
  res.json({ success: true, property });
});

router.put('/re/properties/:tenantId/:propId', authTenant, (req, res) => {
  const tenantId = safeTenantId(req.params.tenantId);
  const properties = readJSON(propFile(tenantId), []);
  const index = properties.findIndex(p => p.id === req.params.propId);
  if (index < 0) return res.status(404).json({ error: 'Property nahi mili' });
  properties[index] = { ...properties[index], ...req.body, updatedAt: new Date().toISOString() };
  writeJSON(propFile(tenantId), properties);
  res.json({ success: true, property: properties[index] });
});

router.delete('/re/properties/:tenantId/:propId', authTenant, (req, res) => {
  const tenantId = safeTenantId(req.params.tenantId);
  const properties = readJSON(propFile(tenantId), []).filter(p => p.id !== req.params.propId);
  writeJSON(propFile(tenantId), properties);
  res.json({ success: true });
});

router.post('/re/rss-import/:tenantId', authTenant, async (req, res) => {
  try {
    const result = await importPropertiesFromRSS(req.params.tenantId, req.body?.rssUrl, req.tenant, {
      status: req.body?.status || 'active'
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/re/bot/handle', async (req, res) => {
  try {
    const { handleRealEstateText } = require('../bots/realEstateBot');
    const result = await handleRealEstateText({
      userId: req.body?.number || 're-sim',
      text: req.body?.message || '',
      tenantId: req.body?.tenantId || 'default',
      name: req.body?.name || 'Customer'
    });
    res.json({ success: true, ...result, reply: (result.replies || []).join('\n\n') });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/re/wa-link/:tenantId', authTenant, (req, res) => {
  const botNumber = normalizePakistanNumber(process.env.RE_BOT_NUMBER || process.env.BOT_NUMBER || req.tenant.whatsappNumber || req.tenant.phone);
  const text = encodeURIComponent(`RE ${req.params.tenantId}`);
  res.json({
    success: true,
    startText: `RE ${req.params.tenantId}`,
    waLink: botNumber ? `https://wa.me/${botNumber}?text=${text}` : ''
  });
});

router.get('/re/admin/tenants', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.SUPER_ADMIN_KEY || 'supersender2024')) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ success: true, tenants: loadTenants().map(publicTenant) });
});

module.exports = router;
