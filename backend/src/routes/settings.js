const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { syncDailyToSheets } = require('../services/sheetsService');
const env = require('../config/env');

const router = express.Router();

const allowedKeys = new Set([
  'ADMIN_NUMBER',
  'JAZZCASH_NUMBER',
  'EASYPAISA_NUMBER',
  'BANK_ACCOUNT',
  'BANK_NAME',
  'GOOGLE_SHEETS_ID',
  'LOW_STOCK_THRESHOLD',
  'SELLING_GROUPS',
  'CUSTOMER_GROUPS',
  'WHATSAPP_NUMBERS',
  'WA_CUSTOMER_SESSION',
  'WA_DEALER_SESSION',
  'WA_ADMIN_SESSION',
  'AI_PROVIDER',
  'AI_MODEL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'DEEPSEEK_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'OLLAMA_HOST'
]);

function validateSettings(body = {}) {
  const errors = [];
  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.has(key) && !/^LOW_[A-Z0-9_]+_THRESHOLD$/.test(key)) errors.push(`${key} is not a supported setting`);
    if (/NUMBER$/.test(key) && value && Array.isArray(value) === false && !/^[+\d\s-]+$/.test(String(value))) errors.push(`${key} must be a phone number`);
    if (/THRESHOLD$/.test(key) && (Number(value) < 0 || Number(value) > 1000)) errors.push(`${key} must be between 0 and 1000`);
  }
  return errors;
}

router.get('/', asyncHandler(async (req, res) => {
  const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  res.json(rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {}));
}));

router.put('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = validateSettings(body);
  if (errors.length) return res.status(400).json({ error: 'Invalid settings', errors });
  const saved = [];
  for (const [key, value] of Object.entries(body)) {
    saved.push(await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    }));
    if (key === 'ADMIN_NUMBER') env.adminNumber = String(value || '');
    if (key === 'LOW_STOCK_THRESHOLD') env.lowStockThreshold = Number(value || env.lowStockThreshold);
    if (key === 'SELLING_GROUPS') env.sellingGroups = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
    if (key === 'CUSTOMER_GROUPS') env.customerGroups = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  }
  await prisma.adminAlert.create({
    data: {
      type: 'settings_updated',
      title: 'Settings updated',
      message: `Saved ${saved.length} settings and reloaded runtime config.`,
      severity: 'info',
      payload: { keys: Object.keys(body) }
    }
  }).catch(() => null);
  res.json({ success: true, saved, reloaded: true });
}));

router.post('/sheets/sync', asyncHandler(async (req, res) => {
  res.json(await syncDailyToSheets());
}));

router.put('/pricing', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const price = Number(body.price);
  if (!body.tool || !body.type || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'tool, type and positive price are required' });
  }
  const tool = await prisma.tool.findFirst({
    where: { OR: [{ slug: String(body.tool).toLowerCase() }, { name: { contains: String(body.tool) } }] }
  });
  const accountType = await prisma.accountType.findUnique({ where: { name: String(body.type) } });
  if (!tool || !accountType) return res.status(404).json({ error: 'Tool or account type not found' });
  const plans = await prisma.toolPlan.findMany({
    where: { toolId: tool.id, ...(body.plan ? { slug: String(body.plan).toLowerCase() } : {}) }
  });
  if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
  const updated = [];
  for (const plan of plans) {
    updated.push(await prisma.pricing.upsert({
      where: { toolId_planId_accountTypeId: { toolId: tool.id, planId: plan.id, accountTypeId: accountType.id } },
      update: {
        price,
        isLimitedTime: body.limited !== undefined ? Boolean(body.limited) : undefined,
        limitedLabel: body.limited ? (env.privateAccountLabel || 'Limited Time Offer') : null
      },
      create: {
        toolId: tool.id,
        planId: plan.id,
        accountTypeId: accountType.id,
        price,
        isLimitedTime: Boolean(body.limited),
        limitedLabel: body.limited ? (env.privateAccountLabel || 'Limited Time Offer') : null,
        policySummary: accountType.policySummary
      }
    }));
  }
  await prisma.adminAlert.create({
    data: {
      type: 'pricing_updated',
      title: `Pricing updated: ${tool.name} ${accountType.name}`,
      message: `Updated ${updated.length} pricing rows to Rs ${price}`,
      severity: 'info',
      payload: { tool: tool.slug, plan: body.plan || 'all', type: accountType.name, price }
    }
  }).catch(() => null);
  res.json({ success: true, updated });
}));

router.get('/templates', asyncHandler(async (req, res) => {
  const rows = await prisma.messageTemplate.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(rows);
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const row = await prisma.messageTemplate.upsert({
    where: { key: body.key },
    update: { name: body.name, body: body.body, category: body.category || 'general', active: body.active !== false },
    create: { name: body.name, key: body.key, body: body.body, category: body.category || 'general', active: body.active !== false }
  });
  res.status(201).json(row);
}));

module.exports = router;
