// lib/purchaseOrders/privacy.js
// PII masking for supplier contact info in API/list views.

'use strict';

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || null;
  const [user, domain] = email.split('@');
  const head = user.slice(0, 2);
  return head + '***@' + domain;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone || null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return '***' + digits.slice(-4);
}

function maskSupplier(s) {
  if (!s) return s;
  return Object.assign({}, s, {
    email: maskEmail(s.email),
    phone: maskPhone(s.phone)
  });
}

module.exports = { maskEmail, maskPhone, maskSupplier };
