  'use strict';
  /**
   * passwordAuth.js — verifies a submitted password against ADMIN_AUTH_ADMIN_PASSWORD_HASH.
      * Supports scrypt hashes in the form `scrypt$<saltHex>$<hashHex>`. No plaintext
      * passwords are ever stored or logged. Constant-time comparison.
      *
      * Generate a hash locally (never commit the password):
   *   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const h=c.scryptSync(process.argv[1],s,32).toString('hex');console.log('scrypt$'+s+'$'+h)" 'YOUR_PASSWORD'
   */
  const crypto = require('crypto');
  const { config } = require('./authConfig');

  function verify(email, password) {
    const c = config();
       if (!c.adminPasswordHash) return { ok: false, reason: 'no_hash_configured' };
       if (c.adminEmail && email && c.adminEmail.toLowerCase() !== String(email).toLowerCase()) {
           return { ok: false, reason: 'bad_credentials' };
       }
       const parts = String(c.adminPasswordHash).split('$');
       if (parts.length !== 3 || parts[0] !== 'scrypt') return { ok: false, reason: 'bad_hash_format' };
       const [, saltHex, hashHex] = parts;
       let derived;
       try { derived = crypto.scryptSync(String(password || ''), Buffer.from(saltHex, 'hex'), 32); }
       catch (e) { return { ok: false, reason: 'verify_error' }; }
       const expected = Buffer.from(hashHex, 'hex');
       const match = derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
    return match ? { ok: true, email: c.adminEmail || email || 'admin', role: 'admin' } : { ok: false, reason:
  'bad_credentials' };
  }


  module.exports = { verify };
