// src/modules/cod/adapters.js
// SuperSender Pro - courier adapters.
// Ships a manualAdapter (works with zero APIs: you set tracking + status by hand)
// and a template HTTP adapter you clone per courier (TCS / Leopards / Trax / PostEx / M&P).
// Every adapter implements: name, book(shipment), track(trackingNumber), cancel(trackingNumber).

'use strict';

const crypto = require('crypto');

// ---- Manual adapter ---------------------------------------------------------
// No external API. book() returns a generated tracking number; status is then
// advanced manually via the /api/cod/status endpoint or the dashboard.
const manualAdapter = {
  name: 'manual',
     async book(shipment) {
       const trackingNumber = 'MAN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
       return { trackingNumber, labelUrl: null };
     },
     async track(_trackingNumber) {
       // Manual: the module advances status from operator input, not polling.
       return { status: null, raw: 'manual: status set by operator' };
     },
     async cancel(_trackingNumber) {
       return { cancelled: true };
     },
};


// ---- HTTP adapter template --------------------------------------------------
// Clone this per real courier. Fill in endpoints/auth/field-mapping from their
// API docs. Uses global fetch (Node 18+). Keep API keys in env, NEVER in code.
function makeHttpAdapter(opts) {
  const {
       name,
       baseUrl,
       apiKeyEnv,            // e.g. 'TCS_API_KEY'
       bookPath = '/shipments',
       trackPath = '/track', // will be called as `${baseUrl}${trackPath}/${trackingNumber}`
       mapBookRequest,       // (shipment) => body object for this courier
       mapBookResponse,      // (json) => ({ trackingNumber, labelUrl })
       mapTrackResponse,     // (json) => ({ status }) mapped to our VALID states
     } = opts;

     const authHeader = () => {
       const key = process.env[apiKeyEnv];
       if (!key) throw new Error(`[cod:${name}] missing env ${apiKeyEnv}`);
       return { Authorization: `Bearer ${key}` };
     };


   return {
     name,
     async book(shipment) {
        const res = await fetch(`${baseUrl}${bookPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(mapBookRequest ? mapBookRequest(shipment) : shipment),
        });
        if (!res.ok) throw new Error(`[cod:${name}] book failed: ${res.status}`);
        const json = await res.json();
        return mapBookResponse ? mapBookResponse(json) : { trackingNumber: json.trackingNumber, labelUrl: json.labelUrl };
     },
     async track(trackingNumber) {
     const res = await fetch(`${baseUrl}${trackPath}/${encodeURIComponent(trackingNumber)}`, { headers: {
...authHeader() } });
        if (!res.ok) throw new Error(`[cod:${name}] track failed: ${res.status}`);
        const json = await res.json();
        return mapTrackResponse ? mapTrackResponse(json) : { status: json.status, raw: json };
     },
     async cancel(trackingNumber) {
       const res = await fetch(`${baseUrl}/shipments/${encodeURIComponent(trackingNumber)}/cancel`, { method: 'POST',
headers: { ...authHeader() } });
     return { cancelled: res.ok };
     },
   };
}


// ---- Example: a TCS-style adapter (fill real endpoints from their docs) -----
// Map THEIR status strings to OUR canonical states.
function normalizeStatus(courierStatus) {
 const s = String(courierStatus || '').toLowerCase();
   if (/deliver/.test(s)) return 'delivered';
   if (/return|rto/.test(s)) return 'returned';
   if (/transit|pick|dispatch|out for/.test(s)) return 'in_transit';
   if (/cancel/.test(s)) return 'cancelled';
   if (/book|created/.test(s)) return 'booked';
   return 'in_transit';
}

const tcsAdapterExample = makeHttpAdapter({
 name: 'tcs',
   baseUrl: 'https://api.tcscourier.com/v1',    // replace with real base URL
   apiKeyEnv: 'TCS_API_KEY',
   mapBookRequest: (s) => ({
     consignee: s.customerName, phone: s.customerNumber, address: s.address,
     destinationCity: s.city, codAmount: s.codAmount, pieces: 1,
   }),
   mapBookResponse: (j) => ({ trackingNumber: j.cn || j.trackingNumber, labelUrl: j.labelUrl || null }),
   mapTrackResponse: (j) => ({ status: normalizeStatus(j.status || (j.checkpoints && j.checkpoints.slice(-1)[0]?.status)),
raw: j }),
});


module.exports = { manualAdapter, makeHttpAdapter, normalizeStatus, tcsAdapterExample };
