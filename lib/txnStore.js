// txnStore.js — transaction store, backed by a JSON file so pending payments survive restarts.
//
// The in-memory Map is the hot path; every mutation is flushed to data/txn_store.json (best-effort).
// On boot we reload that file, so a server restart no longer silently drops pending/unverified
// transactions — the bug where a payment webhook arriving after a restart could never be matched.
//
// ⚠️  MULTI-INSTANCE: this file lives on local disk. If you run multiple replicas, instance A's
// transactions are NOT visible to instance B, so a webhook can still land on the wrong instance and
// miss the txn. For horizontal scaling, move this to shared storage (Postgres/Redis). The API below
// is intentionally tiny so swapping the backend later is a small change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.TXN_DATA_DIR || path.join(__dirname, '..', 'data');
const TXN_FILE = path.join(DATA_DIR, 'txn_store.json');

const store = new Map();

function load() {
  try {
    if (fs.existsSync(TXN_FILE)) {
      const raw = JSON.parse(fs.readFileSync(TXN_FILE, 'utf8'));
      if (raw && Array.isArray(raw.txns)) {
        for (const { id, data } of raw.txns) store.set(id, data);
      }
    }
  } catch {
    /* corrupt/missing file — start empty rather than crash */
  }
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const txns = Array.from(store.entries()).map(([id, data]) => ({ id, data }));
    fs.writeFileSync(TXN_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), txns }, null, 2));
  } catch {
    /* best-effort: never throw from the store layer */
  }
}

load();

function setTxn(id, data) {
  store.set(id, data);
  persist();
}

function getTxn(id) {
  return store.get(id);
}

function deleteTxn(id) {
  const existed = store.delete(id);
  if (existed) persist();
  return existed;
}

function listTxns() {
  return Array.from(store.entries()).map(([id, data]) => ({ id, data }));
}

module.exports = { setTxn, getTxn, deleteTxn, listTxns };
