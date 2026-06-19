// lib/storeBuilder.js
// Store Builder Engine for SuperSenderPro
// Provides functions to create stores, add products, and retrieve store data.
// Stores are persisted under the data/stores directory as JSON files.
// Each store has a unique ID and a collection of products.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORES_DIR = path.join(__dirname, '../data/stores');
const PRODUCTS_DIR = path.join(__dirname, '../data/store_products');

// Ensure required directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
ensureDir(STORES_DIR);
ensureDir(PRODUCTS_DIR);

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a new store.
 * @param {Object} meta - Store metadata (name, owner, description, etc.)
 * @returns {Object} The newly created store object.
 */
function createStore(meta = {}) {
  const id = generateId();
  const store = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    products: [],
    ...meta,
  };
  const storePath = path.join(STORES_DIR, `${id}.json`);
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  return store;
}

/**
 * Load a store by its ID.
 * @param {string} storeId
 * @returns {Object|null}
 */
function getStore(storeId) {
  const storePath = path.join(STORES_DIR, `${storeId}.json`);
  if (!fs.existsSync(storePath)) return null;
  const data = fs.readFileSync(storePath, 'utf8');
  return JSON.parse(data);
}

/**
 * List all stores.
 * @returns {Array<Object>}
 */
function listStores() {
  const files = fs.readdirSync(STORES_DIR);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(STORES_DIR, f), 'utf8')));
}

/**
 * Add a product to a store.
 * @param {string} storeId
 * @param {Object} product - product data (title, price, description, images, etc.)
 * @returns {Object|null} Updated store or null if store not found.
 */
function addProduct(storeId, product = {}) {
  const store = getStore(storeId);
  if (!store) return null;
  const productId = generateId();
  const newProduct = {
    id: productId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...product,
  };
  store.products.push(newProduct);
  store.updatedAt = new Date().toISOString();
  const storePath = path.join(STORES_DIR, `${storeId}.json`);
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');

  // Also persist product separately for potential catalog queries
  const productPath = path.join(PRODUCTS_DIR, `${productId}.json`);
  fs.writeFileSync(productPath, JSON.stringify({ storeId, ...newProduct }, null, 2), 'utf8');
  return store;
}

/**
 * Get a product by its ID.
 * @param {string} productId
 * @returns {Object|null}
 */
function getProduct(productId) {
  const productPath = path.join(PRODUCTS_DIR, `${productId}.json`);
  if (!fs.existsSync(productPath)) return null;
  return JSON.parse(fs.readFileSync(productPath, 'utf8'));
}

/**
 * List all products across stores (optional filter by storeId).
 * @param {string} [storeId]
 * @returns {Array<Object>}
 */
function listProducts(storeId) {
  const files = fs.readdirSync(PRODUCTS_DIR);
  const all = files
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, f), 'utf8')));
  if (storeId) return all.filter(p => p.storeId === storeId);
  return all;
}

module.exports = {
  createStore,
  getStore,
  listStores,
  addProduct,
  getProduct,
  listProducts,
};
