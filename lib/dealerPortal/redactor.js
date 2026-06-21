  'use strict';


  /**
      * Dealer Portal redactor. Masks all dealer-facing PII before it ever leaves
      * a preview. Never throws on bad input. Never returns raw identifiers.
      */

  function str(v) { return v == null ? '' : String(v); }

  function maskName(v) {
    const s = str(v).trim();
       if (!s) return 'Dealer ****';
       const first = s.split(/\s+/)[0];
       return first.slice(0, 2) + '*'.repeat(Math.max(2, first.length - 2));
  }

  function maskPhone(v) {
       const d = str(v).replace(/\D/g, '');
       if (!d) return '***';
       return '*'.repeat(Math.max(0, d.length - 3)) + d.slice(-3);
  }

  function maskEmail(v) {
       const s = str(v).trim();
       const at = s.indexOf('@');
       if (at < 1) return '***';
       return s[0] + '***' + s.slice(at);
  }


  function maskBank(v) {
    const d = str(v).replace(/\s/g, '');
       if (!d) return '****';
       return '**** **** ' + d.slice(-4);
  }

  function maskTax(v) {
    const s = str(v).trim();
       if (!s) return '****';
       return s.slice(0, 2) + '****' + s.slice(-2);
  }

  // National ID (CNIC etc.)
  function maskCnic(v) {
       const d = str(v).replace(/\D/g, '');


      if (!d) return '****';
      return '*****-*******-' + d.slice(-1);
 }


 function maskAddress(v) {
      const s = str(v).trim();
      if (!s) return '****';
      return s.split(',')[0].slice(0, 6) + '… (masked)';
 }

 // Generic ref (order/invoice/document number) — keep tail for support, mask the rest.
 function maskRef(v) {
   const s = str(v).trim();
      if (!s) return '****';
      if (s.length <= 4) return '*'.repeat(s.length);
      return s.slice(0, 2) + '*'.repeat(Math.max(2, s.length - 6)) + s.slice(-4);
 }

 function maskMoney(v) {
      const n = Number(v);
      if (!isFinite(n)) return null;
      // Bucketed preview, never the exact ledger figure.
      if (n <= 0) return '0';
      if (n < 1000) return '<1K';
      if (n < 10000) return '1K–10K';
      if (n < 100000) return '10K–100K';
      if (n < 1000000) return '100K–1M';
      return '1M+';
 }


 module.exports = {
      maskName, maskPhone, maskEmail, maskBank, maskTax,
      maskCnic, maskAddress, maskRef, maskMoney,
 };
