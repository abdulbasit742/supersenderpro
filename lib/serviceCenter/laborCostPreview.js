// lib/serviceCenter/laborCostPreview.js
// Estimates labor cost from technician rate x hours. Pure calc, preview only.
'use strict';


const store = require('./store');
const jobCardModel = require('./jobCardModel');


const DEFAULT_RATE = 1000; // per hour fallback

function forJobCard(jcId) {
  const jc = store.getJobCard(jcId);
    if (!jc) return { ok: false, errors: ['job card not found'] };
    const tech = jc.techId ? store.getTechnician(jc.techId) : null;
    const rate = tech && typeof tech.ratePerHour === 'number' ? tech.ratePerHour : DEFAULT_RATE;
    const laborCost = +(rate * (jc.laborHours || 0)).toFixed(2);
    const partsCost = jobCardModel.partsCost(jc);
    return {
      ok: true,
      ref: jc.ref,
      technician: tech ? tech.name : 'unassigned',
      ratePerHour: rate,
      laborHours: jc.laborHours || 0,
      laborCost,
      partsCost,
      totalCost: +(laborCost + partsCost).toFixed(2),
      note: 'Estimate only. Not billed.'
    };
}


function estimate(laborHours, ratePerHour) {
  const rate = typeof ratePerHour === 'number' ? ratePerHour : DEFAULT_RATE;
    const hours = typeof laborHours === 'number' ? laborHours : 0;
    return { ratePerHour: rate, laborHours: hours, laborCost: +(rate * hours).toFixed(2) };
}

module.exports = { forJobCard, estimate, DEFAULT_RATE };
