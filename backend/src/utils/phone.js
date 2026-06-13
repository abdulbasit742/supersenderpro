function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  if (digits.startsWith('92')) return digits;
  if (digits.length === 10 && digits.startsWith('3')) return `92${digits}`;
  return digits;
}

function toWaJid(value = '') {
  const raw = String(value || '').trim();
  if (raw.includes('@')) return raw;
  const phone = normalizePhone(raw);
  return phone ? `${phone}@s.whatsapp.net` : '';
}

module.exports = { normalizePhone, toWaJid };
