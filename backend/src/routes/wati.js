const express = require('express');
const path = require('path');
const fs = require('fs');
const competitorParity = require('../../../lib/competitorParity');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/costs', asyncHandler(async (req, res) => {
  const tenantId = req.query.tenantId || 'default-tenant';
  const analytics = competitorParity.getCostAnalytics(tenantId);
  res.json({ success: true, ...analytics });
}));

router.post('/costs/log', asyncHandler(async (req, res) => {
  const { tenantId = 'default-tenant', category = 'service', currency = 'USD', country = 'PK' } = req.body || {};
  const costEntry = competitorParity.logConversationCost(tenantId, category, currency, country);
  res.json({ success: true, costEntry });
}));

router.get('/templates', asyncHandler(async (req, res) => {
  const tenantId = req.query.tenantId || 'default-tenant';
  const templatesFile = path.join(__dirname, '../../../data/interactive_templates.json');
  let templates = [];
  try {
    templates = JSON.parse(fs.readFileSync(templatesFile, 'utf8')).templates || [];
  } catch {}
  const filtered = templates.filter(t => !tenantId || t.tenantId === tenantId);
  res.json({ success: true, templates: filtered });
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const { tenantId = 'default-tenant', name, type, bodyText, options = [] } = req.body || {};
  if (!name || !type || !bodyText) {
    return res.status(400).json({ success: false, error: 'name, type and bodyText are required' });
  }
  const template = competitorParity.createInteractiveTemplate(tenantId, name, type, bodyText, options);
  res.json({ success: true, template });
}));

router.get('/ad-leads', asyncHandler(async (req, res) => {
  const tenantId = req.query.tenantId || 'default-tenant';
  const metricsFile = path.join(__dirname, '../../../data/competitor_metrics.json');
  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(metricsFile, 'utf8')).adAttribution || [];
  } catch {}
  const filtered = leads.filter(l => !tenantId || l.tenantId === tenantId);
  res.json({ success: true, leads: filtered });
}));

router.post('/ad-lead', asyncHandler(async (req, res) => {
  const { tenantId = 'default-tenant', adId, sourcePlatform, referralData = {} } = req.body || {};
  if (!adId || !sourcePlatform) {
    return res.status(400).json({ success: false, error: 'adId and sourcePlatform are required' });
  }
  const lead = competitorParity.trackAdLead(tenantId, adId, sourcePlatform, referralData);
  res.json({ success: true, lead });
}));

router.get('/flows', asyncHandler(async (req, res) => {
  const tenantId = req.query.tenantId || 'default-tenant';
  const flows = competitorParity.listChatbotFlows(tenantId);
  res.json({ success: true, flows });
}));

router.post('/flows', asyncHandler(async (req, res) => {
  const tenantId = req.query.tenantId || 'default-tenant';
  const flow = req.body || {};
  if (!flow.id || !flow.name) {
    return res.status(400).json({ success: false, error: 'id and name are required' });
  }
  const savedFlow = competitorParity.saveChatbotFlow(tenantId, flow);
  res.json({ success: true, flow: savedFlow });
}));

router.delete('/flows/:id', asyncHandler(async (req, res) => {
  const tenantId = req.query.tenantId || 'default-tenant';
  const deleted = competitorParity.deleteChatbotFlow(tenantId, req.params.id);
  res.json({ success: true, deleted });
}));

module.exports = router;
