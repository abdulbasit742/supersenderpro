// lib/whiteLabelConfig/index.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../data/white-label-config.json');

const DEFAULT_CONFIG = {
  brandName: process.env.WHITE_LABEL_BRAND_NAME || 'SuperSender Pro',
  tagline: process.env.WHITE_LABEL_TAGLINE || 'AI Business Command Center',
  primaryColor: process.env.WHITE_LABEL_PRIMARY_COLOR || '#00a884',
  secondaryColor: process.env.WHITE_LABEL_SECONDARY_COLOR || '#53bdeb',
  logoUrl: process.env.WHITE_LABEL_LOGO_URL || '',
  faviconUrl: process.env.WHITE_LABEL_FAVICON_URL || '',
  supportWhatsapp: process.env.WHITE_LABEL_SUPPORT_WA || process.env.ADMIN_NUMBER || '',
  supportEmail: process.env.WHITE_LABEL_SUPPORT_EMAIL || '',
  customDomain: process.env.WHITE_LABEL_DOMAIN || '',
  hideBuiltBy: process.env.WHITE_LABEL_HIDE_BUILT_BY === 'true',
  customFooter: process.env.WHITE_LABEL_FOOTER || '',
  currency: process.env.WHITE_LABEL_CURRENCY || 'PKR',
  country: process.env.WHITE_LABEL_COUNTRY || 'PK',
  timezone: process.env.WHITE_LABEL_TIMEZONE || 'Asia/Karachi',
  language: process.env.WHITE_LABEL_LANGUAGE || 'en',
  socialLinks: {},
  updatedAt: null,
};

function load() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return Object.assign({}, DEFAULT_CONFIG, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}'));
    }
  } catch {}
  return Object.assign({}, DEFAULT_CONFIG);
}

function save(updates) {
  const next = Object.assign({}, load(), updates, { updatedAt: new Date().toISOString() });
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

function getPublic() {
  const c = load();
  return { brandName:c.brandName, tagline:c.tagline, primaryColor:c.primaryColor, secondaryColor:c.secondaryColor, logoUrl:c.logoUrl, faviconUrl:c.faviconUrl, customFooter:c.customFooter, hideBuiltBy:c.hideBuiltBy, currency:c.currency, country:c.country, timezone:c.timezone, language:c.language, socialLinks:c.socialLinks||{}, supportWhatsapp:c.supportWhatsapp, supportEmail:c.supportEmail, customDomain:c.customDomain };
}

function getCSSVariables() {
  const c = load();
  return "--brand-primary: " + c.primaryColor + "; --brand-secondary: " + c.secondaryColor + ";";
}

module.exports = { load, save, getPublic, getCSSVariables, DEFAULT_CONFIG };
