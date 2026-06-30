// lib/customer360/timeline.js — Append + read a contact's activity timeline. track() records a
// typed event (counts/metadata only, no message bodies), trimming to the per-contact cap. Other
// departments call track() where things happen so the 360 view stays current.

const store = require('./store');
const { config } = require('./config');
const { maskContact, sanitizeMeta } = require('./privacy');

function _token(contact) { return String(contact); }

function track({ contact, type = 'custom', at, meta = {} } = {}) {
 if (!config.enabled) return null;
 if (!contact) throw new Error('contact is required');
 if (!type) throw new Error('type is required');
 const d = store.load();
 const token = _token(contact);
 const list = d.timelines[token] || (d.timelines[token] = []);
 const ev = { id: store.genId('ev'), type: String(type).slice(0, 40), at: at || store.nowIso(), meta: sanitizeMeta(meta) };
 list.push(ev);
 if (list.length > config.maxEventsPerContact) d.timelines[token] = list.slice(list.length - config.maxEventsPerContact);
 store.save(d);
 return ev;
}

function events(contact, { type, limit = 100 } = {}) {
 const list = (store.load().timelines[_token(contact)] || []).slice();
 let out = type ? list.filter((e) => e.type === type) : list;
 return out.slice().reverse().slice(0, limit);
}
function rawEvents(contact) { return (store.load().timelines[_token(contact)] || []).slice(); }
function contactsTracked() { return Object.keys(store.load().timelines).length; }
function maskedContact(contact) { return maskContact(contact); }

module.exports = { track, events, rawEvents, contactsTracked, maskedContact };
