'use strict';

/**
 * lib/ecommerce/index.js — provider registry.
 * Single place every connector is registered + looked up by id.
 */

const providers = {
  shopify: require('./providers/shopify'),
  woocommerce: require('./providers/woocommerce'),
  daraz: require('./providers/daraz'),
  etsy: require('./providers/etsy'),
  amazon: require('./providers/amazon'),
};

function getProvider(id) { return providers[String(id || '').toLowerCase()] || null; }

function listProviders() {
  return Object.values(providers).map((p) => ({
    id: p.id,
    label: p.label,
    credentialFields: p.credentialFields,
  }));
}

module.exports = { providers, getProvider, listProviders };
