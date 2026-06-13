function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeKey(key = '') {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCustomFields(value) {
  if (!value) return {};
  if (isPlainObject(value)) return { ...value };
  if (typeof value !== 'string') return {};

  const raw = value.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {}

  const fields = {};
  raw.split(/\r?\n|,/).forEach(part => {
    const idx = part.indexOf(':') >= 0 ? part.indexOf(':') : part.indexOf('=');
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) fields[key] = val;
  });
  return fields;
}

function stringifyValue(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(', ');
  if (isPlainObject(value)) return '';
  return String(value);
}

function addLookupValue(lookup, key, value) {
  const text = stringifyValue(value);
  if (!key || text === '') return;
  const raw = String(key).trim();
  const variants = new Set([
    raw,
    raw.toLowerCase(),
    normalizeKey(raw),
    raw.replace(/\s+/g, '_'),
    raw.replace(/\s+/g, '_').toLowerCase()
  ].filter(Boolean));
  variants.forEach(k => lookup.set(k, text));
}

function flattenIntoLookup(lookup, value, prefix = '') {
  if (!isPlainObject(value)) {
    addLookupValue(lookup, prefix, value);
    return;
  }
  Object.entries(value).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(child)) {
      flattenIntoLookup(lookup, child, path);
    } else {
      addLookupValue(lookup, path, child);
      if (!prefix) addLookupValue(lookup, key, child);
    }
  });
}

function buildMergeLookup(context = {}) {
  const lookup = new Map();
  const settings = context.settings || {};
  const customer = context.customer || context.contact || {};
  const vars = {
    ...(context.vars || {}),
    ...(context.variables || {}),
    ...context
  };

  const now = new Date();
  const defaults = {
    date: now.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' }),
    time: now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }),
    business: settings.business_name || settings.store_name || settings.white_label_name || process.env.STORE_NAME || 'SuperSender Pro',
    business_name: settings.business_name || settings.store_name || settings.white_label_name || process.env.STORE_NAME || 'SuperSender Pro',
    store_name: settings.business_name || settings.store_name || settings.white_label_name || process.env.STORE_NAME || 'SuperSender Pro',
    owner: settings.owner_whatsapp || settings.admin_phone || settings.support_whatsapp || '',
    support: settings.support_whatsapp || settings.owner_whatsapp || '',
    support_whatsapp: settings.support_whatsapp || settings.owner_whatsapp || '',
    easypaisa: settings.easypaisa_number || '',
    easypaisa_number: settings.easypaisa_number || '',
    easypaisa_name: settings.easypaisa_name || '',
    jazzcash: settings.jazzcash_number || '',
    jazzcash_number: settings.jazzcash_number || '',
    jazzcash_name: settings.jazzcash_name || '',
    nayapay: settings.nayapay_number || settings.nayapay_iban || '',
    nayapay_number: settings.nayapay_number || '',
    nayapay_iban: settings.nayapay_iban || '',
    nayapay_name: settings.nayapay_name || '',
    askari: settings.askari_account_number || settings.askari_account || '',
    askari_account_number: settings.askari_account_number || settings.askari_account || '',
    askari_account_name: settings.askari_account_name || '',
    bank: settings.bank_iban || settings.bank_account || settings.bank_account_name || '',
    bank_iban: settings.bank_iban || '',
    bank_name: settings.bank_name || '',
    bank_account_name: settings.bank_account_name || '',
    name: customer.name || vars.name || vars.customerName || 'Customer',
    number: customer.number || customer.phone || customer.whatsapp || vars.number || vars.phone || ''
  };

  flattenIntoLookup(lookup, defaults);
  flattenIntoLookup(lookup, settings, 'settings');
  flattenIntoLookup(lookup, vars);
  flattenIntoLookup(lookup, customer, 'customer');
  flattenIntoLookup(lookup, customer);

  const customFields = {
    ...normalizeCustomFields(customer.customFields),
    ...normalizeCustomFields(customer.custom_fields),
    ...normalizeCustomFields(customer.fields),
    ...normalizeCustomFields(vars.customFields),
    ...normalizeCustomFields(vars.custom_fields),
    ...normalizeCustomFields(vars.mergeFields)
  };

  flattenIntoLookup(lookup, customFields, 'custom');
  flattenIntoLookup(lookup, customFields, 'customFields');
  flattenIntoLookup(lookup, customFields);

  return lookup;
}

function resolveMergeValue(lookup, key) {
  const raw = String(key || '').trim();
  if (!raw) return undefined;
  const candidates = [
    raw,
    raw.toLowerCase(),
    normalizeKey(raw),
    raw.replace(/\s+/g, '_'),
    raw.replace(/\s+/g, '_').toLowerCase()
  ];
  for (const candidate of candidates) {
    if (lookup.has(candidate)) return lookup.get(candidate);
  }
  return undefined;
}

function renderMergeFields(text = '', context = {}) {
  const lookup = buildMergeLookup(context);
  let output = String(text || '');

  output = output.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key) => {
    const value = resolveMergeValue(lookup, key);
    return value === undefined ? '' : value;
  });

  output = output.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, choices) => {
    const parts = choices.split('|').map(part => part.trim()).filter(Boolean);
    return parts.length ? parts[Math.floor(Math.random() * parts.length)] : '';
  });

  output = output.replace(/\{\s*([^{}|]+?)\s*\}/g, (match, key) => {
    const value = resolveMergeValue(lookup, key);
    return value === undefined ? match : value;
  });

  return output;
}

function extractMergeFields(text = '') {
  const fields = new Set();
  const source = String(text || '');
  for (const match of source.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) fields.add(match[1].trim());
  for (const match of source.matchAll(/\{\s*([^{}|]+?)\s*\}/g)) fields.add(match[1].trim());
  return Array.from(fields).filter(Boolean);
}

module.exports = {
  buildMergeLookup,
  extractMergeFields,
  normalizeCustomFields,
  normalizeKey,
  renderMergeFields,
  resolveMergeValue
};
