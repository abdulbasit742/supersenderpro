// lib/serviceCenter/technicianDispatchPreview.js
// Suggests best technician for a work order. PREVIEW ONLY — never assigns live.
'use strict';


const store = require('./store');

const FLAGS = { liveAssignment: false };

function scoreTech(tech, wo) {
    let score = 0;
    const reasons = [];
    if (tech.skills.includes(wo.skillNeeded)) { score += 50; reasons.push('skill match'); }
    else { reasons.push('no skill match'); }
    if (tech.zone === wo.zone) { score += 25; reasons.push('same zone'); }
    const free = Math.max(0, tech.capacity - tech.activeJobs);
    score += free * 8;
    reasons.push(free + ' open slot(s)');
    if (tech.activeJobs >= tech.capacity) { score -= 40; reasons.push('at/over capacity'); }
    if (wo.priority === 'urgent' || wo.priority === 'high') {
        score += free > 0 ? 10 : 0;
    }
    return { score, reasons };
}

function suggest(woId, opts = {}) {
    const wo = store.getWorkOrder(woId);
    if (!wo) return { ok: false, errors: ['work order not found'] };
    const ranked = store.technicians
      .map((t) => {
         const { score, reasons } = scoreTech(t, wo);
         return { techId: t.id, name: t.name, zone: t.zone, score, reasons, openSlots: Math.max(0, t.capacity -
t.activeJobs) };
    })
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    return {
      ok: true,
        workOrder: { ref: wo.ref, priority: wo.priority, zone: wo.zone, skillNeeded: wo.skillNeeded },
        recommended: top && top.score > 0 ? top : null,
        ranked: opts.all ? ranked : ranked.slice(0, 3),
        liveAssignment: FLAGS.liveAssignment,
        note: 'Preview only. No technician assigned. Set liveAssignment to enable (disabled).'
    };
}

function boardLoad() {
  return store.technicians.map((t) => ({
        techId: t.id,
        name: t.name,


     zone: t.zone,
     activeJobs: t.activeJobs,
     capacity: t.capacity,
     utilizationPct: Math.round((t.activeJobs / t.capacity) * 100),
     status: t.activeJobs >= t.capacity ? 'full' : t.activeJobs === 0 ? 'idle' : 'available'
   }));
}

module.exports = { FLAGS, suggest, boardLoad, scoreTech };
