 'use strict';
 /**
  * segmentPreview.js — synthetic, masked audience previews. NEVER returns real
  * customer data; numbers are estimates and recipients are fully masked. Can
  * later bridge to src/modules/campaigns segmentation, but stays preview-only here.
  */
 const SEGMENTS = [
      { id: 'all_customers', name: 'All customers', estimate: 1280 },
      { id: 'lapsed_90d', name: 'Lapsed 90+ days', estimate: 214 },
      { id: 'new_leads', name: 'New leads (website widget)', estimate: 96 },
      { id: 'cart_abandoned', name: 'Abandoned cart (7d)', estimate: 48 },
      { id: 'high_value', name: 'High value (top 10%)', estimate: 128 },
      { id: 'payment_pending', name: 'Payment pending', estimate: 33 },
 ];

 function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? '***' : s[0] + '***' +
 s.slice(at); }
 function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }

 function list() { return SEGMENTS.map((s) => ({ id: s.id, name: s.name, estimate: s.estimate })); }

 function preview(segmentId, sampleSize) {
   const seg = SEGMENTS.find((s) => s.id === segmentId) || SEGMENTS[0];
      const n = Math.min(sampleSize || 5, 10);
      const sample = [];
      for (let i = 0; i < n; i++) {
        sample.push({
         recipientEmailMasked: maskEmail('customer' + i + '@example.com'),
         recipientPhoneMasked: maskPhone('+92300000' + (10 + i)),
         consentEmail: i % 4 !== 0, // some withheld to exercise consent UI
         consentSms: i % 3 !== 0,
         sample: true,
       });
      }
      return { segmentId: seg.id, name: seg.name, estimate: seg.estimate, sampleCount: sample.length, sample, note:
 'Synthetic preview only; no real customer data.' };
 }

 module.exports = { list, preview, maskEmail, maskPhone, SEGMENTS };
