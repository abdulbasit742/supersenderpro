'use strict';

/**
 * Pilot Ops — risk score (0-100; higher = more churn risk). Pure function.
    */

const setupProgress = require('./setupProgress');
const trialManager = require('./trialManager');


const FACTORS = [
     { key: 'setupStuck', weight: 15 },
     { key: 'missingWhatsapp', weight: 15 },
     { key: 'missingPayment', weight: 10 },
     { key: 'noActivity', weight: 10 },
     { key: 'incidentsUnresolved', weight: 10 },
     { key: 'customerComplaint', weight: 10 },
     { key: 'trialExpiring', weight: 10 },
     { key: 'billingNotConfigured', weight: 5 },
     { key: 'complianceBlocker', weight: 8 },
     { key: 'customerUnresponsive', weight: 7 },
];


function compute(pilot, signals) {
  const s = signals || {};
     const prog = setupProgress.summarize(pilot && pilot.id);
     const remaining = trialManager.daysRemaining(pilot);
     const values = {
       setupStuck: prog.blocked > 0 || prog.percent < 30 ? 1 : 0,
         missingWhatsapp: s.whatsappConnected ? 0 : 1,
         missingPayment: s.paymentConfigured ? 0 : 1,
         noActivity: s.recentActivity ? 0 : 1,
         incidentsUnresolved: s.incidentsUnresolved ? 1 : 0,
         customerComplaint: s.customerComplaint ? 1 : 0,
         trialExpiring: (remaining != null && remaining <= 3) ? 1 : 0,
         billingNotConfigured: s.billingConfigured ? 0 : 1,
         complianceBlocker: s.complianceBlocker ? 1 : 0,
         customerUnresponsive: s.customerUnresponsive ? 1 : 0,
     };
     let total = 0;
     const breakdown = {};
  FACTORS.forEach(function (f) { const pts = Math.round((values[f.key] || 0) * f.weight); breakdown[f.key] = pts; total
+= pts; });
     const level = total >= 60 ? 'high' : total >= 30 ? 'medium' : 'low';
     return { score: Math.max(0, Math.min(100, total)), level: level, breakdown: breakdown, trialDaysRemaining: remaining };
}


module.exports = { FACTORS, compute };
