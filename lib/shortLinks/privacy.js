// lib/shortLinks/privacy.js — Mask contact identifiers + user-agent for click records.

function maskContact(c) {
 if (!c) return null;
 const s = String(c);
 if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); }
 const digits = s.replace(/[^0-9+]/g, '');
 if (digits.length <= 4) return '****';
 return digits.slice(0, 3) + '****' + digits.slice(-2);
}
// Keep only a coarse device/browser family from a UA string; drop the rest (no fingerprinting).
function coarseUA(ua) {
 const s = String(ua || '').toLowerCase();
 if (!s) return 'unknown';
 if (s.includes('android')) return 'android';
 if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) return 'ios';
 if (s.includes('windows')) return 'windows';
 if (s.includes('mac os') || s.includes('macintosh')) return 'mac';
 if (s.includes('linux')) return 'linux';
 if (s.includes('bot') || s.includes('crawl') || s.includes('spider')) return 'bot';
 return 'other';
}
function host(referrer) { try { return referrer ? new URL(referrer).host : null; } catch (_e) { return null; } }

module.exports = { maskContact, coarseUA, host };
