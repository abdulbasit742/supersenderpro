  'use strict';

  /**
      * Localization - per-business config store + resolver (Phase 1).
      * Stores each business's choices and RESOLVES the effective config by merging:
      *   country profile < business overrides < (optional) industry preset.
      * Read-only effect on other modules: they read resolve() to know currency,
      * locale, which gateways/hubs to show. No secrets. JSON-file store.
      */

  const fs = require('fs');
  const path = require('path');
  const countries = require('./countryProfiles');
  const i18n = require('./i18n');

  function storePath() {
    const p = process.env.BUSINESS_CONFIG_STORE_PATH || 'data/business-config.json';
       return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
  function read() { try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); } catch (_e) { return { businesses: {}
  }; } }
  function write(d) { try { fs.mkdirSync(path.dirname(storePath()), { recursive: true }); fs.writeFileSync(storePath(),
  JSON.stringify(d, null, 2), 'utf8'); } catch (_e) {} }

  // Optional: pull a recommended preset from Business Setup Wizard if present.
  function presetFor(type) {
    try {
         const presets = require(path.resolve(process.cwd(), 'lib/businessSetup/industryPresets'));
         if (presets && typeof presets.get === 'function') return presets.get(type) || null;
       } catch (_e) {}
       return null;
  }

  /**
   * Save a business config.
      * @param {{ id, name?, country?, type?, locale?, channels?, hubs? }} cfg
      */
  function set(cfg) {
    cfg = cfg || {};
       if (!cfg.id) return { ok: false, error: 'business_id_required' };
       const d = read(); if (!d.businesses) d.businesses = {};
       d.businesses[cfg.id] = Object.assign({}, d.businesses[cfg.id], {
         id: cfg.id,
      name: cfg.name != null ? String(cfg.name).slice(0, 80) : (d.businesses[cfg.id] && d.businesses[cfg.id].name) ||
  cfg.id,
      country: (cfg.country || (d.businesses[cfg.id] && d.businesses[cfg.id].country) ||
  countries.defaultCode()).toUpperCase(),


      type: cfg.type || (d.businesses[cfg.id] && d.businesses[cfg.id].type) || 'general',
      localeOverride: cfg.locale || (d.businesses[cfg.id] && d.businesses[cfg.id].localeOverride) || null,
      channels: Array.isArray(cfg.channels) ? cfg.channels : (d.businesses[cfg.id] && d.businesses[cfg.id].channels) ||
['whatsapp'],
   hubs: Array.isArray(cfg.hubs) ? cfg.hubs : (d.businesses[cfg.id] && d.businesses[cfg.id].hubs) || ['ecommerce',
'payments'],
   updatedAt: new Date().toISOString()
    });
    write(d);
    return { ok: true, config: resolve(cfg.id) };
}

function getRaw(id) { return read().businesses[id] || null; }

/**
   * Resolve the effective config for a business: merge country + business + preset.
   */
function resolve(id) {
 const b = getRaw(id);
    if (!b) return null;
    const country = countries.get(b.country) || countries.get(countries.defaultCode());
    const locale = b.localeOverride || country.locale;
    const preset = presetFor(b.type);
    return {
      business: { id: b.id, name: b.name, type: b.type },
      country: country.code,
      countryName: country.name,
      currency: country.currency,
      currencySymbol: country.currencySymbol,
      locale: locale,
      phoneCc: country.phoneCc,
      phoneFormat: country.phoneFormat,
      paymentGateways: country.paymentGateways,
      ecommercePlatforms: country.ecommerce,
      channels: b.channels,
      hubs: b.hubs,
      compliance: country.compliance,
      strings: i18n.pack(locale),
      preset: preset ? (preset.id || b.type) : b.type
    };
}

function list() { return Object.keys(read().businesses).map(resolve); }
function status() { const d = read(); return { storePath: process.env.BUSINESS_CONFIG_STORE_PATH || 'data/business-\nconfig.json', businesses: Object.keys(d.businesses || {}).length }; }

module.exports = { set, getRaw, resolve, list, status };
