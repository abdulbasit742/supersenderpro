// lib/storeAIAgent.js
/**
 * Store AI Agent Builder
 *
 * This module creates a lightweight rule‑based AI agent for a specific store.
 * It answers queries about products, policies, and general assistance.
 *
 * Usage:
 *   const { createStoreAgent } = require('./lib/storeAIAgent');
 *   const handleMessage = await createStoreAgent(storeId);
 *   const reply = await handleMessage(incomingMessage);
 */

const { getStore, listProducts } = require('./storeBuilder');

function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
}

function containsKeyword(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function generateReply(store, products, message) {
  const txt = normalise(message);

  // Greeting/help
  if (containsKeyword(txt, ['hi', 'hello', 'hey', 'help'])) {
    return `👋 Hello! I am the assistant for *${store.name}*. Ask about products, delivery, payment, etc.`;
  }

  // Policies
  if (containsKeyword(txt, ['delivery', 'shipping', 'ship'])) {
    return store.deliveryPolicy || 'We offer delivery across the city. Please check your location for exact timings.';
  }
  if (containsKeyword(txt, ['payment', 'pay'])) {
    return store.paymentPolicy || 'We accept cash on delivery, JazzCash and EasyPaisa.';
  }
  if (containsKeyword(txt, ['return', 'refund', 'exchange'])) {
    return store.returnPolicy || 'You can return products within 7 days of receipt if unused.';
  }

  // Product lookup
  for (const product of products) {
    const nameNorm = normalise(product.title || product.name || '');
    if (txt.includes(nameNorm)) {
      const price = product.price ? `₹${product.price}` : 'price not listed';
      const stock = product.stock !== undefined ? `Stock: ${product.stock}` : '';
      return `*${product.title || product.name}* - ${price}\n${stock}\n${product.description || ''}`;
    }
  }

  // Fallback list
  const top = products.slice(0, 3).map(p => `• ${p.title || p.name} - ₹${p.price || 'N/A'}`).join('\n');
  return `Sorry, I didn't understand that. Here are some popular items:\n${top}\nYou can ask for a specific product name or any store policy.`;
}

async function createStoreAgent(storeId) {
  const store = await getStore(storeId);
  if (!store) throw new Error(`Store ${storeId} not found`);
  const products = await listProducts(storeId);
  return async (incomingMessage) => {
    if (!incomingMessage || typeof incomingMessage !== 'string') {
      return "Sorry, I couldn't understand your message.";
    }
    try {
      return generateReply(store, products, incomingMessage);
    } catch (e) {
      console.error('Store agent error:', e);
      return "Sorry, something went wrong while processing your request.";
    }
  };
}

module.exports = { createStoreAgent };
