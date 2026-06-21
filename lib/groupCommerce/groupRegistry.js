// lib/groupCommerce/groupRegistry.js
// Group Commerce OS - per-group registry. Stores settings, modes, masked admins.

'use strict';

const crypto = require('crypto');
const store = require('./store');

const nowMs = () => Date.now();
function maskNumber(n) { return String(n || '').replace(/.(?=.{4})/g, '•'); }
function genId() { return 'grp_' + crypto.randomBytes(5).toString('hex'); }


const DEFAULT_COMMANDS = ['/help', '/status', '/pause', '/resume', '/catalog', '/products', '/stock', '/price',
'/sellers', '/buyers', '/orders', '/rules', '/banlink', '/approve', '/warn', '/remove', '/appreciate', '/agent',
'/relay', '/ecom', '/social'];

function shape(input) {
    const g = input || {};
    return {
      groupId: g.groupId || genId(),
      groupName: g.groupName || 'Unnamed group',
      platform: g.platform || 'whatsapp',
      linkedTenantId: g.linkedTenantId || null,
      linkedEcommerceStoreId: g.linkedEcommerceStoreId || null,
      linkedCatalogId: g.linkedCatalogId || null,
      adminNumbersMasked: Array.isArray(g.adminNumbers) ? g.adminNumbers.map(maskNumber) : (g.adminNumbersMasked || []),
      _adminHashes: Array.isArray(g.adminNumbers) ? g.adminNumbers.map((n) => hash(n)) : (g._adminHashes || []),
      allowedCommands: g.allowedCommands || DEFAULT_COMMANDS,
      moderationMode: g.moderationMode || 'monitor',     // off | monitor | enforce(dry-run)
      commerceMode: g.commerceMode === true,
      aiAgentMode: g.aiAgentMode === true,
      relaySettings: g.relaySettings || { enabled: false, channels: [] },
      pauseSettings: g.pauseSettings || { pausedUntil: 0, scope: [] },
      createdAt: g.createdAt || nowMs(),
      updatedAt: nowMs(),
    };
}

function hash(n) { return crypto.createHash('sha256').update(String(n)).digest('hex').slice(0, 16); }


function register(input) {
    const db = store.readGroups();
    const g = shape(input);
    db.groups[g.groupId] = g;
    store.writeGroups(db);
    store.appendHistory({ type: 'group_registered', groupId: g.groupId });
    return g;
}
function list() { return Object.values(store.readGroups().groups); }
function get(id) { return store.readGroups().groups[String(id)] || null; }

function update(id, patch) {


     const db = store.readGroups();
     const cur = db.groups[String(id)];
     if (!cur) return null;
     const next = Object.assign({}, cur, patch || {}, { groupId: cur.groupId, updatedAt: nowMs() });
     if (patch && Array.isArray(patch.adminNumbers)) {
         next.adminNumbersMasked = patch.adminNumbers.map(maskNumber);
         next._adminHashes = patch.adminNumbers.map(hash);
         delete next.adminNumbers;
     }
     db.groups[String(id)] = next;
     store.writeGroups(db);
     return next;
}

const setCommerceMode = (id, on) => update(id, { commerceMode: !!on });
const setAgentMode = (id, on) => update(id, { aiAgentMode: !!on });
function setRelayMode(id, on) {
     const g = get(id); if (!g) return null;
     return update(id, { relaySettings: Object.assign({}, g.relaySettings, { enabled: !!on }) });
}


// Verify an admin by number (hashed compare). Returns false if unverifiable.
function isAdmin(id, number) {
     const g = get(id);
     if (!g || !number) return false;
     return (g._adminHashes || []).includes(hash(number));
}


module.exports = { register, list, get, update, setCommerceMode, setAgentMode, setRelayMode, isAdmin, maskNumber,
DEFAULT_COMMANDS };
