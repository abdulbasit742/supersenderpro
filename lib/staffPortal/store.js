// lib/staffPortal/store.js — Demo-safe, in-memory preview data for the Staff Portal. NO real staff PII.
'use strict';

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

const DEMO_STAFF = {
  id: 'stf_demo_1',
  name: 'Demo Employee',
  phone: '+923001234567',
  email: 'demo.employee@example.com',
  address: { area: 'Gulberg', city: 'Lahore' },
  role: 'Sales Associate',
  branch: 'Lahore Main Branch',
  attendance: { todayStatus: 'present', monthPresent: 21, monthAbsent: 1, monthLate: 2 },
  shifts: [{ id: 'shf_1', day: 'Today', time: '09:00–18:00', status: 'scheduled' }],
  leave: { annualTotal: 20, annualUsed: 8, annualBalance: 12, sickBalance: 6, pending: 1 },
  payroll: { id: 'pay_2026_06', period: 'Jun 2026', status: 'processing', net: 0 },
  payslips: [{ id: 'pslip_2026_05', period: 'May 2026', status: 'available' }],
  commission: { period: 'Jun 2026', earnedPreview: 0, dealsClosed: 4, status: 'accruing' },
  expenses: [{ id: 'exp_3001', type: 'Travel', status: 'pending', amount: 0 }],
  tasks: [{ id: 'tsk_4001', title: 'Follow up leads', status: 'in_progress', due: iso(1) }],
  sops: [{ id: 'sop_5001', name: 'Daily Opening Checklist', status: 'incomplete', steps: 6, done: 4 }],
  branchAssignment: { branch: 'Lahore Main Branch', shiftPattern: 'Morning', manager: 'Manager A' },
  approvals: [{ id: 'apr_6001', type: 'Leave request', status: 'pending' }],
  contracts: [{ id: 'con_7001', name: 'Employment Agreement', status: 'active', expiry: iso(180) }],
  documents: [{ id: 'doc_8001', name: 'Offer Letter', status: 'available' }, { id: 'doc_8002', name: 'Tax Form', status: 'missing' }],
};

function findStaffPreview(input = {}) {
  const mode = input.mode || input.lookupMode || 'demo_preview';
  const supported = ['preview_token', 'masked_phone_lookup_preview', 'employee_code_preview', 'demo_preview'];
  const accessMode = supported.includes(mode) ? mode : 'demo_preview';
  return { staff: DEMO_STAFF, accessMode, found: true };
}

function demoStaff() { return DEMO_STAFF; }

module.exports = { DEMO_STAFF, findStaffPreview, demoStaff, iso };
