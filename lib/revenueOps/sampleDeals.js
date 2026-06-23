// lib/revenueOps/sampleDeals.js — deterministic demo dataset (no real customer data). Read-only.
'use strict';

// Stage catalogue (preview).
const STAGES = ['New Lead', 'Contacted', 'Qualified', 'Demo / Discussion', 'Quotation Sent',
  'Negotiation', 'Payment Pending', 'Won Preview', 'Lost Preview', 'Dormant / Nurture'];

// Fixed, deterministic sample opportunities. Raw-ish fields are always masked on output.
const SAMPLE_OPPORTUNITIES = [
  { id: 'opp_demo_1', customerName: 'Ahmed Traders', phone: '+923001234567', email: 'ahmed@example.com', company: 'Ahmed Traders', address: 'Block 5, Karachi', value: 850000, valueBand: 'high', stage: 'Quotation Sent', lastContactDays: 2, replies: 5, quoteSent: true, paymentStatus: 'none', source: 'WhatsApp', owner: 'Bilal Khan', complaintRisk: false, consent: 'opt_in' },
  { id: 'opp_demo_2', customerName: 'Sara Mart', phone: '+923009876543', email: 'sara@example.com', company: 'Sara Mart', address: 'Gulberg, Lahore', value: 120000, valueBand: 'medium', stage: 'New Lead', lastContactDays: 12, replies: 1, quoteSent: false, paymentStatus: 'none', source: 'Facebook', owner: 'Ayesha Ali', complaintRisk: false, consent: 'unknown' },
  { id: 'opp_demo_3', customerName: 'Zee Electronics', phone: '+923331112233', email: 'zee@example.com', company: 'Zee Electronics', address: 'Saddar, Rawalpindi', value: 2400000, valueBand: 'enterprise', stage: 'Negotiation', lastContactDays: 5, replies: 8, quoteSent: true, paymentStatus: 'partial', source: 'Referral', owner: 'Bilal Khan', complaintRisk: false, consent: 'opt_in' },
  { id: 'opp_demo_4', customerName: 'Noor Fabrics', phone: '+923215556677', email: 'noor@example.com', company: 'Noor Fabrics', address: 'Faisalabad', value: 45000, valueBand: 'low', stage: 'Payment Pending', lastContactDays: 9, replies: 3, quoteSent: true, paymentStatus: 'pending', source: 'WhatsApp', owner: 'Ayesha Ali', complaintRisk: true, consent: 'opt_in' },
  { id: 'opp_demo_5', customerName: 'Imran Auto', phone: '+923458889900', email: 'imran@example.com', company: 'Imran Auto', address: 'Multan', value: 300000, valueBand: 'high', stage: 'Demo / Discussion', lastContactDays: 1, replies: 4, quoteSent: false, paymentStatus: 'none', source: 'Website', owner: 'Bilal Khan', complaintRisk: false, consent: 'opt_in' },
  { id: 'opp_demo_6', customerName: 'Hina Beauty', phone: '+923021234500', email: 'hina@example.com', company: 'Hina Beauty', address: 'Hyderabad', value: 90000, valueBand: 'medium', stage: 'Qualified', lastContactDays: 20, replies: 2, quoteSent: false, paymentStatus: 'none', source: 'Instagram', owner: 'Ayesha Ali', complaintRisk: false, consent: 'unknown' },
  { id: 'opp_demo_7', customerName: 'Kashan Foods', phone: '+923137778899', email: 'kashan@example.com', company: 'Kashan Foods', address: 'Peshawar', value: 600000, valueBand: 'high', stage: 'Won Preview', lastContactDays: 3, replies: 9, quoteSent: true, paymentStatus: 'paid', source: 'Referral', owner: 'Bilal Khan', complaintRisk: false, consent: 'opt_in' },
  { id: 'opp_demo_8', customerName: 'Tariq Mobiles', phone: '+923442223344', email: 'tariq@example.com', company: 'Tariq Mobiles', address: 'Quetta', value: 150000, valueBand: 'medium', stage: 'Dormant / Nurture', lastContactDays: 40, replies: 1, quoteSent: false, paymentStatus: 'none', source: 'Facebook', owner: 'Ayesha Ali', complaintRisk: false, consent: 'opt_out' },
  { id: 'opp_demo_9', customerName: 'Fatima Decor', phone: '+923051239876', email: 'fatima@example.com', company: 'Fatima Decor', address: 'Sialkot', value: 75000, valueBand: 'medium', stage: 'Contacted', lastContactDays: 6, replies: 2, quoteSent: false, paymentStatus: 'none', source: 'WhatsApp', owner: 'Bilal Khan', complaintRisk: false, consent: 'opt_in' },
  { id: 'opp_demo_10', customerName: 'Usman Steel', phone: '+923067654321', email: 'usman@example.com', company: 'Usman Steel', address: 'Gujranwala', value: 40000, valueBand: 'low', stage: 'Lost Preview', lastContactDays: 30, replies: 2, quoteSent: true, paymentStatus: 'none', source: 'Website', owner: 'Ayesha Ali', complaintRisk: true, consent: 'opt_in' },
];

// Leads are a lightweight view of early-stage records.
const SAMPLE_LEADS = SAMPLE_OPPORTUNITIES
  .filter((o) => ['New Lead', 'Contacted', 'Qualified'].includes(o.stage))
  .map((o) => ({ id: o.id.replace('opp_', 'lead_'), name: o.customerName, phone: o.phone, email: o.email, source: o.source, stage: o.stage }));

function getSampleOpportunities() { return SAMPLE_OPPORTUNITIES.map((o) => Object.assign({}, o)); }
function getSampleLeads() { return SAMPLE_LEADS.map((l) => Object.assign({}, l)); }

module.exports = { STAGES, getSampleOpportunities, getSampleLeads };
