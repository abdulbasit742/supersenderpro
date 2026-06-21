'use strict';
/**
 * Localization - per-country defaults (Phase 1).
 */
const COUNTRIES = {
  PK: {
    code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: 'Rs',
    locale: 'ur', altLocales: ['en'], phoneCc: '+92', phoneFormat: '03XX-XXXXXXX',
    paymentGateways: ['jazzcash', 'easypaisa', 'stripe'], ecommerce: ['daraz', 'shopify', 'woocommerce'],
    compliance: 'PTA SMS/marketing rules; honor STOP opt-out.'
  },
  IN: {
    code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹',
    locale: 'hi', altLocales: ['en'], phoneCc: '+91', phoneFormat: 'XXXXX-XXXXX',
    paymentGateways: ['stripe', 'paypal'], ecommerce: ['shopify', 'woocommerce', 'magento'],
    compliance: 'DLT registration for SMS; WhatsApp opt-in required.'
  },
  AE: {
    code: 'AE', name: 'UAE', currency: 'AED', currencySymbol: 'د.إ',
    locale: 'ar', altLocales: ['en'], phoneCc: '+971', phoneFormat: '05X-XXXXXXX',
    paymentGateways: ['stripe', 'paypal'], ecommerce: ['shopify', 'woocommerce'],
    compliance: 'TDRA marketing consent; Arabic + English support expected.'
  },
  SA: {
    code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: '﷼',
    locale: 'ar', altLocales: ['en'], phoneCc: '+966', phoneFormat: '05X-XXXXXXX',
    paymentGateways: ['stripe', 'paypal'], ecommerce: ['shopify', 'woocommerce'],
    compliance: 'CITC rules; Arabic-first.'
  },
  US: {
    code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$',
    locale: 'en', altLocales: [], phoneCc: '+1', phoneFormat: '(XXX) XXX-XXXX',
    paymentGateways: ['stripe', 'paypal'], ecommerce: ['shopify', 'woocommerce', 'magento'],
    compliance: 'TCPA consent for SMS; clear opt-out.'
  },
  GB: {
    code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£',
    locale: 'en', altLocales: [], phoneCc: '+44', phoneFormat: '07XXX XXXXXX',
    paymentGateways: ['stripe', 'paypal'], ecommerce: ['shopify', 'woocommerce'],
    compliance: 'UK GDPR + PECR; explicit marketing consent.'
  }
};
function get(code) { return COUNTRIES[String(code || '').toUpperCase()] || null; }
function list() { return Object.values(COUNTRIES); }
function codes() { return Object.keys(COUNTRIES); }
function defaultCode() { return process.env.DEFAULT_COUNTRY || 'PK'; }
module.exports = { COUNTRIES, get, list, codes, defaultCode };
