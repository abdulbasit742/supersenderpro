// txnStore.js – simple in‑memory transaction store
// In a production app this would be persisted (e.g. DB, Redis).

const store = new Map();

function setTxn(id, data) {
  store.set(id, data);
}

function getTxn(id) {
  return store.get(id);
}

function deleteTxn(id) {
  store.delete(id);
}

function listTxns() {
  return Array.from(store.entries()).map(([id, data]) => ({ id, data }));
}

module.exports = { setTxn, getTxn, deleteTxn, listTxns };
