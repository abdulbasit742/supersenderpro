// lib/serviceCenter/store.js
// In-memory, preview-only data store for the Service Center.
// No DB, no disk writes. Seeds sample data so dashboards render offline.
'use strict';

const crypto = require('crypto');


function id(prefix) {
  return prefix + '_' + crypto.randomBytes(5).toString('hex');
}

const now = Date.now();
const DAY = 86400000;

const technicians = [
  { id: 'tech_01', name: 'Imran Q.', skills: ['ac', 'refrigeration'], zone: 'North', activeJobs: 1, capacity: 3,
ratePerHour: 1200 },
  { id: 'tech_02', name: 'Sana R.', skills: ['electrical', 'wiring'], zone: 'Central', activeJobs: 2, capacity: 3,
ratePerHour: 1000 },
    { id: 'tech_03', name: 'Bilal A.', skills: ['plumbing'], zone: 'South', activeJobs: 0, capacity: 4, ratePerHour: 900 },
    { id: 'tech_04', name: 'Hira M.', skills: ['ac', 'electrical'], zone: 'North', activeJobs: 3, capacity: 3, ratePerHour:
1300 }
];

const workOrders = [
    {
        id: 'wo_1001', ref: 'WO-1001', customerId: 'cust_501',
        customerName: 'Ayesha Khan', phone: '+923001234567', email: 'ayesha.k@example.com',
        address: 'House 12, Street 4, DHA Phase 5, Karachi',
        asset: 'Split AC 1.5 ton', problem: 'Not cooling, water leakage',
        priority: 'high', zone: 'North', status: 'diagnosed',
        skillNeeded: 'ac', assignedTech: 'tech_01',
        createdAt: now - 2 * DAY, slaDueAt: now + 1 * DAY
    },
    {
        id: 'wo_1002', ref: 'WO-1002', customerId: 'cust_502',
        customerName: 'Usman Tariq', phone: '+923215557890', email: 'usman.t@example.com',
        address: 'Flat 7B, Gulberg III, Lahore',
        asset: 'Ceiling wiring', problem: 'Frequent tripping breaker',
        priority: 'medium', zone: 'Central', status: 'open',
        skillNeeded: 'electrical', assignedTech: null,
        createdAt: now - 1 * DAY, slaDueAt: now + 2 * DAY
    },
    {
        id: 'wo_1003', ref: 'WO-1003', customerId: 'cust_503',
        customerName: 'Fatima Noor', phone: '+923334449988', email: 'fatima.n@example.com',
        address: 'House 88, Bahria Town, Islamabad',
        asset: 'Water motor', problem: 'No water pressure',
        priority: 'low', zone: 'South', status: 'open',


        skillNeeded: 'plumbing', assignedTech: null,
        createdAt: now - 6 * 3600000, slaDueAt: now + 3 * DAY
    }
];

const jobCards = [
 {
        id: 'jc_2001', workOrderId: 'wo_1001', ref: 'JC-2001',
        techId: 'tech_01', status: 'in_progress',
        diagnosis: 'Gas leak + clogged drain pipe',
        laborHours: 2.5,
        parts: [
          { sku: 'PART-GAS-R410', name: 'Refrigerant R410a (kg)', qty: 1, unitCost: 3500 },
          { sku: 'PART-DRAIN-KIT', name: 'Drain cleaning kit', qty: 1, unitCost: 800 }
        ],
        notes: 'Customer approved gas refill verbally',
        startedAt: now - 1 * 3600000, completedAt: null
    }
];


const paymentRefs = {
    wo_1001: 'PAY-AC-99213',
    wo_1002: null,
    wo_1003: null
};


module.exports = {
    id,
    technicians,
    workOrders,
    jobCards,
    paymentRefs,
    getWorkOrder: (woId) => workOrders.find((w) => w.id === woId || w.ref === woId) || null,
    getJobCard: (jcId) => jobCards.find((j) => j.id === jcId || j.ref === jcId) || null,
    getTechnician: (tId) => technicians.find((t) => t.id === tId) || null,
    jobCardsForWorkOrder: (woId) => jobCards.filter((j) => j.workOrderId === woId)
};
