// src/modules/channels/channels.js
// SuperSender Pro - Omnichannel Messaging Layer core.
// One unified inbound shape + one send() across platform adapters, so every
// engine runs channel-agnostic. Tracks cross-channel customer identity.
// Adapter pattern (like the COD couriers). Dry-run-safe, auditable.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const DATA_DIR = process.env.CHANNELS_DATA_DIR || path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'channels.json');

const CONFIG = {
  enabled: String(process.env.CHANNELS_ENABLED || 'true') === 'true',
     dryRun: String(process.env.CHANNELS_DRY_RUN || 'true') === 'true',
};


const nowMs = () => Date.now();
const _adapters = {};           // channel name -> adapter
let _onMessage = null;          // the app's channel-agnostic handler

function ensureStore() {
     if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
     if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ identities: {}, messages: [], stats: {}
}, null, 2));
}
function readStore() {
  ensureStore();
     try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
     catch (_) { return { identities: {}, messages: [], stats: {} }; }
}
function writeStore(s) {
     ensureStore();
     if (s.messages.length > 20000) s.messages = s.messages.slice(-20000);
     fs.writeFileSync(STORE_PATH, JSON.stringify(s, null, 2));
}

// ---- Adapter registry -------------------------------------------------------

// adapter: { name, send(to,text)->Promise, parseInbound(body)->[{from,text,name,raw}] (optional),
//            kind: 'two-way' | 'link-only' }
function addAdapter(adapter) {
     if (!adapter || !adapter.name || typeof adapter.send !== 'function') {
       throw new Error('[channels] adapter needs name + send()');
     }
     _adapters[adapter.name] = adapter;


   return { added: adapter.name, kind: adapter.kind || 'two-way' };
}
function channelsList() { return Object.keys(_adapters); }
function setOnMessage(fn) { _onMessage = fn; }

// ---- Cross-channel identity -------------------------------------------------
// A person on telegram:123 and whatsapp:9230... can be linked under one id.
function identityKey(channel, from) { return `${channel}:${from}`; }

function recordIdentity(channel, from, name) {
 const store = readStore();
   const key = identityKey(channel, from);
   const rec = store.identities[key] || { key, channel, from, name: name || null, firstSeenAt: nowMs(), messages: 0,
linkedTo: null };
 rec.name = name || rec.name;
   rec.lastSeenAt = nowMs();
   rec.messages += 1;
   store.identities[key] = rec;
   writeStore(store);
   return rec;
}

// Manually link two channel identities as the same human.
function linkIdentities(keyA, keyB) {
 const store = readStore();
   if (store.identities[keyA] && store.identities[keyB]) {
     const groupId = store.identities[keyA].linkedTo || 'grp_' + crypto.randomBytes(4).toString('hex');
       store.identities[keyA].linkedTo = groupId;
       store.identities[keyB].linkedTo = groupId;
       writeStore(store);
       return { linked: true, groupId };
   }
   return { linked: false };
}

// ---- Inbound (normalize -> hand to the app's onMessage) ---------------------


async function ingest(channel, normalized) {
 if (!CONFIG.enabled) return { skipped: true };
   const msg = {
     channel,
       from: String(normalized.from),
       text: normalized.text != null ? String(normalized.text) : '',
       name: normalized.name || null,
       raw: normalized.raw || null,
       at: nowMs(),
   };
   recordIdentity(channel, msg.from, msg.name);

   const store = readStore();
   store.messages.push({ dir: 'in', channel, from: msg.from, text: msg.text.slice(0, 500), at: msg.at });
   store.stats[`in_${channel}`] = (store.stats[`in_${channel}`] || 0) + 1;
   writeStore(store);


   if (typeof _onMessage === 'function') {
       try { await _onMessage(msg); } catch (e) { console.error('[channels] onMessage error:', e && e.message); }
   }


   return { ok: true, msg };
}

// Parse a raw webhook body via the channel's adapter, then ingest each message.
async function handleWebhook(channel, body) {
   const adapter = _adapters[channel];
   if (!adapter) return { ok: false, reason: `no adapter for ${channel}` };
   if (typeof adapter.parseInbound !== 'function') return { ok: false, reason: `${channel} has no inbound parser` };
   const list = (await adapter.parseInbound(body)) || [];
   const out = [];
   for (const n of list) out.push(await ingest(channel, n));
   return { ok: true, ingested: out.length };
}

// ---- Outbound ---------------------------------------------------------------


async function send({ channel, to, text }) {
   if (!CONFIG.enabled) return { ok: false, reason: 'disabled' };
   const adapter = _adapters[channel];
   if (!adapter) return { ok: false, reason: `no adapter for ${channel} (have: ${channelsList().join(',') || 'none'})` };


   const store = readStore();
   store.messages.push({ dir: 'out', channel, to: String(to), text: String(text).slice(0, 500), at: nowMs(), dryRun:
CONFIG.dryRun });
 store.stats[`out_${channel}`] = (store.stats[`out_${channel}`] || 0) + 1;
   writeStore(store);

   if (CONFIG.dryRun) {
     console.log(`[channels][DRY-RUN] ${channel} -> ${to}: ${String(text).slice(0, 60)}`);
       return { ok: true, dryRun: true };
   }
   if (adapter.kind === 'link-only') {
     // Can't actually send; return the deep link the adapter produces.
       const link = adapter.link ? adapter.link(to, text) : null;
       return { ok: false, reason: 'link-only channel', link };
   }
   try {
       const r = await adapter.send(to, text);
       return { ok: true, result: r };
   } catch (e) {
     return { ok: false, error: String(e && e.message ? e.message : e) };
   }
}


function getStats() {
   const store = readStore();
   const identities = Object.values(store.identities);
   const byChannel = {};
   for (const c of channelsList()) {
       byChannel[c] = {
         kind: (_adapters[c] && _adapters[c].kind) || 'two-way',
         in: store.stats[`in_${c}`] || 0,
         out: store.stats[`out_${c}`] || 0,
         customers: identities.filter((i) => i.channel === c).length,
       };
   }
   return {


      channels: channelsList(),
      byChannel,
      totalCustomers: identities.length,
      totalMessages: store.messages.length,
      recent: store.messages.slice(-15).reverse(),
      config: CONFIG,
    };
}


module.exports = {
 CONFIG, addAdapter, channelsList, setOnMessage,
    ingest, handleWebhook, send,
    recordIdentity, linkIdentities, identityKey, getStats,
    _internal: { readStore, writeStore },
};
