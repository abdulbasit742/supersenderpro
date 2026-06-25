const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');

const FILE = path.join(__dirname, '../../../data/saas_billing.json');
const PLANS_FILE = path.join(__dirname, '../../../data/saas_plans.json');
function loadBilling() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e) { return []; } }
function saveBilling(d) { fs.writeFileSync(FILE, JSON.stringify(d.slice(0,5000), null, 2)); }

const DEFAULT_PLANS = [
  { id: 'starter', name: 'Starter', price: 2999, currency: 'PKR', interval: 'month',
    features: ['Up to 100 customers', '1 WhatsApp session', 'Basic AI replies', 'Invoice generation', 'Email support'],
    limits: { customers: 100, waSession: 1, aiReplies: 100, agents: 1 } },
  { id: 'growth', name: 'Growth', price: 7999, currency: 'PKR', interval: 'month',
    features: ['Up to 500 customers', '3 WhatsApp sessions', 'AI Function Calling', 'All analytics', 'Quote + Invoice', 'Priority support'],
    limits: { customers: 500, waSession: 3, aiReplies: 1000, agents: 3 } },
  { id: 'business', name: 'Business', price: 17999, currency: 'PKR', interval: 'month',
    features: ['Unlimited customers', '10 WhatsApp sessions', 'All 6 AI agents', 'Custom AI training', 'White-label', 'Dedicated support'],
    limits: { customers: -1, waSession: 10, aiReplies: -1, agents: 6 } },
  { id: 'enterprise', name: 'Enterprise', price: 0, currency: 'PKR', interval: 'month',
    features: ['Everything in Business', 'Custom pricing', 'SLA guarantee', 'On-premise option', 'Success manager'],
    limits: { customers: -1, waSession: -1, aiReplies: -1, agents: -1 }, contactSales: true }
];

function loadPlans() { try { return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf8')); } catch(e) { return DEFAULT_PLANS; } }

router.get('/plans', asyncHandler(async (req, res) => { res.json(loadPlans()); }));

router.get('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
  res.json(loadBilling().slice(0, Number(req.query.limit || 50)));
}));

router.post('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
  const { tenantId, tenantName, planId, contactPhone, contactEmail } = req.body || {};
  if (!tenantId || !planId) return res.status(400).json({ error: 'tenantId and planId required' });
  const plan = loadPlans().find(function(p) { return p.id === planId; });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const billing = loadBilling();
  const existing = billing.find(function(b) { return b.tenantId === tenantId && b.status === 'active'; });
  if (existing) return res.status(409).json({ error: 'Active subscription exists', subscription: existing });
  const startDate = new Date();
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);
  const sub = { id: uuid(), tenantId: tenantId, tenantName: tenantName||tenantId, planId: planId, plan: { name: plan.name, price: plan.price }, contactPhone: contactPhone||'', contactEmail: contactEmail||'', status: 'active', startDate: startDate.toISOString(), endDate: endDate.toISOString(), autoRenew: true, usage: { customers: 0, waSession: 0, aiReplies: 0 }, invoices: [], createdAt: new Date().toISOString(), createdBy: req.user.email };
  billing.unshift(sub); saveBilling(billing);
  res.status(201).json(sub);
}));

router.get('/subscriptions/:id', requireAuth, asyncHandler(async (req, res) => {
  const sub = loadBilling().find(function(b) { return b.id === req.params.id; });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  const plan = loadPlans().find(function(p) { return p.id === sub.planId; });
  const daysLeft = Math.ceil((new Date(sub.endDate) - Date.now()) / 86400000);
  res.json(Object.assign({}, sub, { plan: plan, daysLeft: daysLeft, isExpired: daysLeft < 0, isExpiringSoon: daysLeft <= 7 && daysLeft > 0 }));
}));

router.patch('/subscriptions/:id/renew', requireAuth, asyncHandler(async (req, res) => {
  const billing = loadBilling();
  const idx = billing.findIndex(function(b) { return b.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const newEnd = new Date(billing[idx].endDate); newEnd.setMonth(newEnd.getMonth() + 1);
  billing[idx].endDate = newEnd.toISOString(); billing[idx].status = 'active';
  (billing[idx].invoices = billing[idx].invoices || []).push({ id: uuid(), amount: billing[idx].plan.price, date: new Date().toISOString(), status: 'pending' });
  saveBilling(billing); res.json(billing[idx]);
}));

router.patch('/subscriptions/:id/upgrade', requireAuth, asyncHandler(async (req, res) => {
  const { planId } = req.body || {};
  const newPlan = loadPlans().find(function(p) { return p.id === planId; });
  if (!newPlan) return res.status(404).json({ error: 'Plan not found' });
  const billing = loadBilling();
  const idx = billing.findIndex(function(b) { return b.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Subscription not found' });
  billing[idx].planId = planId; billing[idx].plan = { name: newPlan.name, price: newPlan.price }; billing[idx].upgradedAt = new Date().toISOString();
  saveBilling(billing); res.json(billing[idx]);
}));

router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const billing = loadBilling();
  const active = billing.filter(function(b) { return b.status === 'active'; });
  const mrr = active.reduce(function(s, b) { return s + (b.plan && b.plan.price || 0); }, 0);
  const expiringSoon = active.filter(function(b) { const d = Math.ceil((new Date(b.endDate)-Date.now())/86400000); return d > 0 && d <= 7; });
  const byPlan = {};
  active.forEach(function(b) { byPlan[b.planId] = (byPlan[b.planId]||0)+1; });
  res.json({ totalSubscriptions: billing.length, activeSubscriptions: active.length, mrr: mrr, arr: mrr*12, expiringSoon: expiringSoon.length, byPlan: byPlan });
}));

module.exports = router;