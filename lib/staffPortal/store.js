// lib/staffPortal/store.js — Demo-safe, in-memory preview data for the Staff Portal.
// NO real staff data. Used only to render safe previews. Nothing here is committed as real PII.
'use strict';

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();
const isoTime = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };

// A single demo staff member with linked demo records across every HR/work module.
const DEMO_STAFF = {
  id: 'staff_demo_1',
  name: 'Demo Employee',
  phone: '+923001234567',
  email: 'demo.staff@example.com',
  address: { area: 'DHA', city: 'Karachi', line: '12 Demo Avenue' },
  cnic: '42101-1234567-8',
  role: 'employee',
  branch: 'Main Branch',
  employmentStatus: 'active',
  attendance: { date: iso(0), checkIn: isoTime(9, 12), checkOut: '', status: 'present', late: true },
  shift: { id: 'shift_morning_1', name: 'Morning', start: isoTime(9), end: isoTime(17), branch: 'Main Branch' },
  leave: {
    annual: 8, sick: 4, casual: 2,
    requests: [{ id: 'lv_3001', type: 'annual', status: 'pending', dates: [iso(7), iso(8)] }],
  },
  payroll: { id: 'pr_4001', period: '2026-06', gross: 0, deductions: 0, net: 0, status: 'preview_only', salaryRef: 'salary_secret_1', bankRef: 'bank_secret_1' },
  payslips: [{ id: 'payslip_5001', period: '2026-05', status: 'available' }],
  commission: { period: '2026-06', sales: 0, commission: 0, payoutStatus: 'pending' },
  expenses: [
    { id: 'exp_6001', amount: 0, approvalStatus: 'pending', paymentStatus: 'not_paid' },
  ],
  tasks: [
    { id: 'task_7001', title: 'Daily store opening', status: 'in_progress', overdue: false },
    { id: 'task_7002', title: 'Stock count report', status: 'open', overdue: true },
  ],
  sops: [
    { id: 'sop_8001', title: 'Opening checklist', status: 'completed' },
    { id: 'sop_8002', title: 'Closing checklist', status: 'pending' },
  ],
  approvals: [
    { id: 'apr_9001', type: 'leave', status: 'pending' },
  ],
  documents: [
    { id: 'doc_1101', name: 'Appointment Letter', status: 'available' },
    { id: 'doc_1102', name: 'ID Card Copy', status: 'missing' },
  ],
  contracts: [
    { id: 'con_1201', name: 'Employment Agreement', status: 'expiring', expiry: iso(20) },
  ],
};

// Preview lookup: in demo mode any supported lookup returns the demo staff member.
function findStaffPreview(input = {}) {
  const mode = input.mode || input.lookupMode || 'demo_preview';
  const supported = ['preview_token', 'masked_phone_lookup_preview', 'staff_reference_preview',
    'employee_code_preview', 'branch_staff_preview', 'demo_preview'];
  const accessMode = supported.includes(mode) ? mode : 'demo_preview';
  // Always returns the demo staff member — there is no real lookup against live data.
  return { staff: DEMO_STAFF, accessMode, found: true };
}

function demoStaff() {
  return DEMO_STAFF;
}

module.exports = { DEMO_STAFF, findStaffPreview, demoStaff, iso };
