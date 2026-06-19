// bots/storeBot.js
// WhatsApp Store Bot – handles store creation and product management via WhatsApp commands.
// This bot is designed to be plugged into the existing WhatsApp message handling pipeline.
// It uses the Store Builder module (lib/storeBuilder.js) for data persistence.

const { createStore, getStore, listStores, addProduct, getProduct, listProducts } = require('../lib/storeBuilder');

// Simple in‑memory session store for multi‑step interactions (e.g., creating a store, adding a product).
const sessions = new Map();

function sessionKey(userId, tenantId = 'default') {
  return `${tenantId}:${userId}`;
}

function getSession(userId, tenantId = 'default') {
  const key = sessionKey(userId, tenantId);
  if (!sessions.has(key)) sessions.set(key, { step: 'idle', data: {} });
  return sessions.get(key);
}

function resetSession(userId, tenantId = 'default') {
  const key = sessionKey(userId, tenantId);
  sessions.set(key, { step: 'idle', data: {} });
}

function mainMenu() {
  return `🛒 *SuperSender Store Bot*
━━━━━━━━━━━━━━━━━━━━━━
1️⃣ Create Store
2️⃣ List My Stores
3️⃣ Add Product to Store
4️⃣ List Products in Store
🛑 Type *menu* to see this again.`;
}

/**
 * Parse a plain text command from the user and route to the appropriate handler.
 * @param {Object} msg – WhatsApp message object (expects `from` and `body`).
 * @param {string} tenantId – Optional tenant identifier for multi‑tenant deployments.
 * @returns {Promise<Object[]>} – Array of reply strings to be sent back.
 */
async function handleStoreMessage(msg, tenantId = 'default') {
  const userId = msg.from;
  const raw = String(msg.body || '').trim();
  const lower = raw.toLowerCase();
  const session = getSession(userId, tenantId);

  // Global shortcuts
  if (['menu', 'start', 'hi', 'hello', 'back', '0'].includes(lower)) {
    resetSession(userId, tenantId);
    return [mainMenu()];
  }

  // Idle state – expect a top‑level command number
  if (session.step === 'idle') {
    switch (raw) {
      case '1': // Create Store
        session.step = 'createStore_name';
        return ['✍️ *Enter store name:*'];
      case '2': // List Stores
        const stores = listStores().filter(s => s.ownerId === userId || true); // In a real setup filter by owner
        if (!stores.length) return ['📭 No stores found. Use *1* to create one.'];
        return [
          '🏬 *Your Stores:*',
          ...stores.map((s, i) => `${i + 1}. ${s.name || 'Unnamed'} (ID: ${s.id})`),
          '\nType *menu* to return to the main menu.'
        ];
      case '3': // Add Product
        session.step = 'addProduct_selectStore';
        return ['🛍️ *Enter Store ID to add a product to:*'];
      case '4': // List Products
        session.step = 'listProducts_storeId';
        return ['📦 *Enter Store ID to view its products:*'];
      default:
        return ['❓ Unrecognized option. Type *menu* for help.'];
    }
  }

  // ----- Create Store flow -----
  if (session.step.startsWith('createStore_')) {
    switch (session.step) {
      case 'createStore_name':
        session.data.name = raw;
        session.step = 'createStore_owner';
        return ['👤 *Enter owner name (or type "skip")*:'];
      case 'createStore_owner':
        session.data.owner = raw.toLowerCase() === 'skip' ? '' : raw;
        // Persist the store
        const newStore = createStore({
          name: session.data.name,
          owner: session.data.owner,
          ownerId: userId,
          tenantId
        });
        resetSession(userId, tenantId);
        return [
          `✅ Store *${newStore.name}* created!`,
          `Store ID: ${newStore.id}`,
          '\nType *menu* for more options.'
        ];
    }
  }

  // ----- Add Product flow -----
  if (session.step.startsWith('addProduct_')) {
    switch (session.step) {
      case 'addProduct_selectStore':
        const store = getStore(raw);
        if (!store) return ['❌ Store not found. Please provide a valid Store ID.'];
        session.data.storeId = store.id;
        session.step = 'addProduct_title';
        return ['📦 *Enter product title:*'];
      case 'addProduct_title':
        session.data.title = raw;
        session.step = 'addProduct_price';
        return ['💰 *Enter price (e.g., 25000 or 2.5 lakh):*'];
      case 'addProduct_price':
        // Simple numeric extraction – keep as raw string for flexibility.
        session.data.price = raw;
        session.step = 'addProduct_desc';
        return ['📝 *Enter a short description (or "skip")*:'];
      case 'addProduct_desc':
        session.data.description = raw.toLowerCase() === 'skip' ? '' : raw;
        // Persist product
        const updatedStore = addProduct(session.data.storeId, {
          title: session.data.title,
          price: session.data.price,
          description: session.data.description,
          createdBy: userId,
          tenantId
        });
        resetSession(userId, tenantId);
        return [
          '✅ Product added successfully!',
          `Store ID: ${session.data.storeId}`,
          '\nType *menu* for more options.'
        ];
    }
  }

  // ----- List Products flow -----
  if (session.step === 'listProducts_storeId') {
    const storeId = raw;
    const storeObj = getStore(storeId);
    if (!storeObj) return ['❌ Store not found. Please provide a valid Store ID.'];
    const products = listProducts(storeId);
    if (!products.length) return ['📭 No products found for this store.'];
    resetSession(userId, tenantId);
    return [
      `📦 *Products in store ${storeObj.name || storeId}:*`,
      ...products.map((p, i) => `${i + 1}. ${p.title || 'Untitled'} – ${p.price || 'N/A'} (ID: ${p.id})`),
      '\nType *menu* for more options.'
    ];
  }

  // Fallback – reset and show menu
  resetSession(userId, tenantId);
  return ['❗ Unexpected state. Resetting.\n', mainMenu()];
}

module.exports = { handleStoreMessage };
