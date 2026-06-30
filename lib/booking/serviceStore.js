// lib/booking/serviceStore.js — Define bookable services + their weekly availability. A service:
// { id, name, durationMins, staff?, slotGranularityMins?, availability: { 0..6: [{ start, end }] } }
// where availability maps weekday (0=Sun..6=Sat) to working windows in 'HH:MM' local time. Services
// are deactivated, never hard-deleted.

const store = require('./store');
const { config } = require('./config');

function _hhmmToMins(s) { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); if (!m) return null; return (+m[1]) * 60 + (+m[2]); }

function _normAvailability(av) {
 const out = {};
 for (const [day, windows] of Object.entries(av || {})) {
 const dnum = Number(day);
 if (!(dnum >= 0 && dnum <= 6) || !Array.isArray(windows)) continue;
 out[dnum] = windows.map((w) => ({ start: String(w.start), end: String(w.end) })).filter((w) => _hhmmToMins(w.start) !== null && _hhmmToMins(w.end) !== null && _hhmmToMins(w.end) > _hhmmToMins(w.start));
 }
 return out;
}

function publicView(s) {
 if (!s) return null;
 return { id: s.id, name: s.name, durationMins: s.durationMins, staff: s.staff || null, slotGranularityMins: s.slotGranularityMins || config.slotGranularityMins, availability: s.availability || {}, active: s.active !== false, createdAt: s.createdAt };
}

function create({ name, durationMins, staff, slotGranularityMins, availability } = {}) {
 if (!name) throw new Error('name is required');
 const dur = Number(durationMins);
 if (!(dur > 0)) throw new Error('durationMins must be > 0');
 const d = store.load();
 const s = {
 id: store.genId('svc'), name: String(name), durationMins: dur,
 staff: staff ? String(staff) : null,
 slotGranularityMins: Number(slotGranularityMins) > 0 ? Number(slotGranularityMins) : config.slotGranularityMins,
 availability: _normAvailability(availability || {}), active: true, createdAt: store.nowIso(),
 };
 d.services.push(s); store.save(d);
 return publicView(s);
}

function update(id, changes = {}) {
 const d = store.load(); const s = d.services.find((x) => x.id === id);
 if (!s) throw new Error('service not found');
 if (changes.name !== undefined) s.name = String(changes.name);
 if (changes.durationMins !== undefined) { const dur = Number(changes.durationMins); if (!(dur > 0)) throw new Error('durationMins must be > 0'); s.durationMins = dur; }
 if (changes.staff !== undefined) s.staff = changes.staff ? String(changes.staff) : null;
 if (changes.slotGranularityMins !== undefined && Number(changes.slotGranularityMins) > 0) s.slotGranularityMins = Number(changes.slotGranularityMins);
 if (changes.availability !== undefined) s.availability = _normAvailability(changes.availability);
 if (changes.active !== undefined) s.active = !!changes.active;
 s.updatedAt = store.nowIso(); store.save(d);
 return publicView(s);
}

function all() { return store.load().services.map(publicView); }
function get(id) { return publicView(store.load().services.find((s) => s.id === id)); }
function raw(id) { return store.load().services.find((s) => s.id === id) || null; }

module.exports = { create, update, all, get, raw, publicView, _hhmmToMins };
