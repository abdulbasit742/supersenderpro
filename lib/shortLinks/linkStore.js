// lib/shortLinks/linkStore.js — Create + resolve short links. A link maps a unique code to a
// validated destination URL, with optional campaign + tags + expiry. Links are deactivated, never
// hard-deleted. Codes are globally unique (regenerated on the rare collision).

const store = require('./store');
const { config } = require('./config');
const codeGen = require('./codeGen');
const urlGuard = require('./urlGuard');

function shortUrl(code) { return `${config.baseUrl.replace(/\/$/, '')}${config.routePrefix}/${code}`; }

function publicView(l) {
 if (!l) return null;
 return { id: l.id, code: l.code, shortUrl: shortUrl(l.code), destination: l.destination, campaign: l.campaign || null, tags: l.tags || [], active: l.active, clicks: l.clicks || 0, uniqueContacts: (l.contactsSeen || []).length, expiresAt: l.expiresAt || null, createdAt: l.createdAt };
}

function create({ destination, campaign, tags, expiresAt, code } = {}) {
 const v = urlGuard.validate(destination);
 if (!v.ok) throw new Error('destination rejected: ' + v.reason);
 const d = store.load();
 let theCode = code && /^[A-Za-z0-9]+$/.test(code) ? code : codeGen.generate(config.codeLength);
 let guard = 0;
 while (d.links.some((l) => l.code === theCode) && guard < 20) { theCode = codeGen.generate(config.codeLength); guard += 1; }
 const rec = {
 id: store.genId('lnk'), code: theCode, destination: v.url, destinationHost: v.host,
 campaign: campaign ? String(campaign) : null, tags: Array.isArray(tags) ? tags.map(String) : [],
 active: true, clicks: 0, contactsSeen: [], expiresAt: expiresAt || null,
 createdAt: store.nowIso(),
 };
 d.links.push(rec); store.save(d);
 return publicView(rec);
}

function all() { return store.load().links.map(publicView); }
function getByCode(code) { return store.load().links.find((l) => l.code === code) || null; }
function getById(id) { return store.load().links.find((l) => l.id === id) || null; }
function setActive(id, active) {
 const d = store.load(); const l = d.links.find((x) => x.id === id);
 if (!l) throw new Error('link not found'); l.active = !!active; store.save(d); return publicView(l);
}

module.exports = { create, all, getByCode, getById, setActive, publicView, shortUrl };
