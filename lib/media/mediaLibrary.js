'use strict';
/**
 * mediaLibrary.js — Media Feature #1: a reusable media asset library.
 *
 * Senders reuse the same images/flyers/PDFs across many campaigns. Re-uploading each time is
 * wasteful and inconsistent. This is a library: register an asset once (by URL or path), tag it,
 * organise into folders, and reference it by id from broadcasts, templates, and drips. Dedupes by a
 * content key so the same file isn't stored twice, and tracks usage.
 *
 * Storage: JSON metadata (data/media_library.json). The bytes live wherever they already do (the
 * app's public/ media dirs or an external URL) — this stores references + metadata, not blobs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'media_library.json');
const TYPES = ['image', 'video', 'document', 'audio'];

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { assets: [], folders: [] }; }
  catch { return { assets: [], folders: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const keyOf = (s) => crypto.createHash('sha1').update(String(s || '')).digest('hex').slice(0, 16);

function guessType(ref) {
  const ext = String(ref || '').toLowerCase().split('.').pop();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image';
  if (['mp4','mov','avi','webm','mkv'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
  return 'document';
}

/**
 * Register a media asset. ref = http(s) url or local path.
 * @param {Object} opts { ref, name?, type?, tags?, folderId? }
 */
function addAsset(opts = {}) {
  const ref = String(opts.ref || '').trim();
  if (!ref) throw new Error('ref (url or path) required');
  const data = load();
  const contentKey = keyOf(ref);
  const existing = data.assets.find(a => a.contentKey === contentKey);
  if (existing) return existing; // dedupe

  const asset = {
    id: `MED-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    ref,
    name: opts.name || ref.split('/').pop() || 'asset',
    type: TYPES.includes(opts.type) ? opts.type : guessType(ref),
    tags: Array.isArray(opts.tags) ? opts.tags.map(t => String(t).toLowerCase()) : [],
    folderId: opts.folderId || null,
    contentKey,
    usageCount: 0,
    createdAt: nowIso()
  };
  data.assets.push(asset);
  save(data);
  return asset;
}

function listAssets(filter = {}) {
  let rows = load().assets;
  if (filter.type) rows = rows.filter(a => a.type === filter.type);
  if (filter.folderId) rows = rows.filter(a => a.folderId === filter.folderId);
  if (filter.tag) rows = rows.filter(a => (a.tags || []).includes(String(filter.tag).toLowerCase()));
  if (filter.search) {
    const q = String(filter.search).toLowerCase();
    rows = rows.filter(a => a.name.toLowerCase().includes(q) || (a.tags || []).some(t => t.includes(q)));
  }
  return rows.slice().reverse();
}

function getAsset(id) { return load().assets.find(a => a.id === id) || null; }

/** Resolve an asset to its ref for sending, bumping usage. */
function useAsset(id) {
  const data = load();
  const a = data.assets.find(x => x.id === id);
  if (!a) return null;
  a.usageCount = (a.usageCount || 0) + 1;
  a.lastUsedAt = nowIso();
  save(data);
  return { id: a.id, ref: a.ref, type: a.type, name: a.name };
}

function deleteAsset(id) {
  const data = load();
  const before = data.assets.length;
  data.assets = data.assets.filter(a => a.id !== id);
  save(data);
  return { deleted: before - data.assets.length };
}

// --- folders ---
function createFolder(name) {
  if (!name) throw new Error('folder name required');
  const data = load();
  const folder = { id: `FOLDER-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, name, createdAt: nowIso() };
  data.folders.push(folder);
  save(data);
  return folder;
}
function listFolders() { return load().folders; }

module.exports = { TYPES, addAsset, listAssets, getAsset, useAsset, deleteAsset, createFolder, listFolders };
