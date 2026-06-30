// lib/returns/privacy.js
// Lightweight PII masking helpers shared across the returns department.

'use strict';

const config = require('./config');

function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const head = user.slice(0, 1);
  return `${head}***@${domain}`;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}

function maskName(name) {
  if (!name || typeof name !== 'string') return name;
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => p.slice(0, 1) + '***').join(' ');
}

// Returns a shallow-cleaned copy of a customer object for safe display.
function maskCustomer(customer) {
  if (!customer || !config.maskPII) return customer || null;
  return {
    ...customer,
    email: maskEmail(customer.email),
    phone: maskPhone(customer.phone),
    name: maskName(customer.name)
  };
}

module.exports = { maskEmail, maskPhone, maskName, maskCustomer };
