// lib/bulkImportExport/exportEngine.js — Export the contact book (from lib/contacts when present)
// to CSV or JSON. Contact identifiers are masked by default; pass includePII:true for a full
// export (intended for the owner's own backups, behind admin auth).

const csv = require('./csv');

let contactsLib = null; try { contactsLib = require('../contacts'); } catch (_e) { contactsLib = null; }

function _rows({ includePII = false } = {}) {
 if (!contactsLib) return [];
 const list = contactsLib.contactStore.all();
 return list.map((c) => {
 if (includePII) {
 return { id: c.id, name: c.name || '', phone: c.phone || '', email: c.email || '', tags: (c.tags || []).join('|'), consent: c.consent, status: c.status, createdAt: c.createdAt, fields: JSON.stringify(c.fields || {}) };
 }
 const v = contactsLib.segmentEngine.publicContact(c);
 return { id: v.id, name: v.nameMasked || '', phone: v.phoneMasked || '', email: v.emailMasked || '', tags: (v.tags || []).join('|'), consent: v.consent, status: v.status };
 });
}

function toCSV(opts = {}) {
 const rows = _rows(opts);
 const cols = opts.includePII ? ['id', 'name', 'phone', 'email', 'tags', 'consent', 'status', 'createdAt', 'fields'] : ['id', 'name', 'phone', 'email', 'tags', 'consent', 'status'];
 return csv.stringify(rows, cols);
}
function toJSON(opts = {}) { return _rows(opts); }
function available() { return !!contactsLib; }

module.exports = { toCSV, toJSON, available };
