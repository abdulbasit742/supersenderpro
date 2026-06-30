// lib/shortLinks/analytics.js — Roll up clicks into useful numbers: totals, unique contacts,
// by-campaign, by-UA, and a day-bucketed time series. Read-only; pure over the stored clicks.

const store = require('./store');

function _day(iso) { return String(iso).slice(0, 10); }

function forLink(code) {
 const d = store.load();
 const link = d.links.find((l) => l.code === code);
 if (!link) return null;
 const clicks = d.clicks.filter((c) => c.code === code);
 const series = {};
 const uaMap = {};
 for (const c of clicks) { series[_day(c.at)] = (series[_day(c.at)] || 0) + 1; uaMap[c.ua] = (uaMap[c.ua] || 0) + 1; }
 return {
 code, shortUrl: require('./linkStore').shortUrl(code), destination: link.destination, campaign: link.campaign || null,
 totalClicks: clicks.length, uniqueContacts: (link.contactsSeen || []).length,
 byUA: Object.entries(uaMap).map(([k, v]) => ({ ua: k, count: v })).sort((a, b) => b.count - a.count),
 timeSeries: Object.entries(series).map(([bucket, count]) => ({ bucket, count })).sort((a, b) => (a.bucket < b.bucket ? -1 : 1)),
 };
}

function byCampaign() {
 const d = store.load();
 const map = {};
 for (const c of d.clicks) { const k = c.campaign || '(none)'; map[k] = map[k] || { campaign: k, clicks: 0, contacts: new Set() }; map[k].clicks += 1; if (c.contactMasked) map[k].contacts.add(c.contactMasked); }
 return Object.values(map).map((x) => ({ campaign: x.campaign, clicks: x.clicks, uniqueContacts: x.contacts.size })).sort((a, b) => b.clicks - a.clicks);
}

function overview() {
 const d = store.load();
 return {
 generatedAt: store.nowIso(),
 cards: {
 links: d.links.length,
 activeLinks: d.links.filter((l) => l.active).length,
 totalClicks: d.clicks.length,
 campaigns: new Set(d.links.map((l) => l.campaign).filter(Boolean)).size,
 },
 topLinks: d.links.slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10).map((l) => ({ code: l.code, destination: l.destination, clicks: l.clicks || 0, campaign: l.campaign || null })),
 byCampaign: byCampaign(),
 };
}

module.exports = { forLink, byCampaign, overview };
