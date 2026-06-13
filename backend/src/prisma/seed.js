require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { ACCOUNT_TYPES, TOOL_PLANS } = require('../config/catalog');

const prisma = new PrismaClient();

async function seedAdmin() {
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' },
    update: {},
    create: {
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      passwordHash,
      role: 'ADMIN'
    }
  });
}

async function seedCatalog() {
  const toolMap = new Map();
  const planMap = new Map();
  const typeMap = new Map();

  for (const item of TOOL_PLANS) {
    const tool = await prisma.tool.upsert({
      where: { slug: item.toolSlug },
      update: { name: item.tool, active: true },
      create: { name: item.tool, slug: item.toolSlug, category: 'AI Tool', active: true }
    });
    toolMap.set(item.toolSlug, tool);

    const plan = await prisma.toolPlan.upsert({
      where: { toolId_slug: { toolId: tool.id, slug: item.planSlug } },
      update: {
        name: item.plan,
        defaultSellPrice: item.prices.warranty,
        desiredMarginPct: 25,
        lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 3),
        active: true
      },
      create: {
        toolId: tool.id,
        name: item.plan,
        slug: item.planSlug,
        defaultSellPrice: item.prices.warranty,
        desiredMarginPct: 25,
        lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 3),
        active: true
      }
    });
    planMap.set(`${item.toolSlug}:${item.planSlug}`, plan);
  }

  for (const type of ACCOUNT_TYPES) {
    const accountType = await prisma.accountType.upsert({
      where: { name: type.name },
      update: {
        label: type.label,
        policyText: type.policyText,
        policySummary: type.policySummary,
        maxIssueResolutions: type.maxIssueResolutions,
        maxReplacements: type.maxReplacements,
        sharedLogin: type.sharedLogin,
        sortOrder: type.sortOrder
      },
      create: {
        name: type.name,
        label: type.label,
        policyText: type.policyText,
        policySummary: type.policySummary,
        maxIssueResolutions: type.maxIssueResolutions,
        maxReplacements: type.maxReplacements,
        sharedLogin: type.sharedLogin,
        sortOrder: type.sortOrder
      }
    });
    typeMap.set(type.name, accountType);
  }

  for (const item of TOOL_PLANS) {
    const tool = toolMap.get(item.toolSlug);
    const plan = planMap.get(`${item.toolSlug}:${item.planSlug}`);
    for (const type of ACCOUNT_TYPES) {
      const accountType = typeMap.get(type.name);
      await prisma.pricing.upsert({
        where: { toolId_planId_accountTypeId: { toolId: tool.id, planId: plan.id, accountTypeId: accountType.id } },
        update: {
          price: item.prices[type.name],
          isLimitedTime: type.name === 'private',
          limitedLabel: type.name === 'private' ? (process.env.PRIVATE_ACCOUNT_LABEL || type.limitedLabel || 'LIMITED TIME') : null,
          policySummary: type.policySummary
        },
        create: {
          toolId: tool.id,
          planId: plan.id,
          accountTypeId: accountType.id,
          price: item.prices[type.name],
          isLimitedTime: type.name === 'private',
          limitedLabel: type.name === 'private' ? (process.env.PRIVATE_ACCOUNT_LABEL || type.limitedLabel || 'LIMITED TIME') : null,
          policySummary: type.policySummary,
          manualSlots: type.name === 'private' ? 3 : 0
        }
      });

      await prisma.stockInventory.upsert({
        where: { toolSlug_planSlug_accountType: { toolSlug: item.toolSlug, planSlug: item.planSlug, accountType: type.name } },
        update: { lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 3) },
        create: {
          toolSlug: item.toolSlug,
          planSlug: item.planSlug,
          accountType: type.name,
          quantityAvailable: type.name === 'private' ? 3 : 0,
          quantityTotal: type.name === 'private' ? 3 : 0,
          lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 3),
          autoReorder: true
        }
      });
    }
  }
}

async function seedTemplates() {
  await prisma.messageTemplate.upsert({
    where: { key: 'welcome' },
    update: {},
    create: {
      key: 'welcome',
      name: 'Customer Welcome',
      category: 'bot',
      body: 'Assalam o Alaikum! 👋\nAI Tools subscriptions available hain.\n\n1️⃣ Price list\n2️⃣ Stock\n3️⃣ Order\n4️⃣ Track order\n5️⃣ Support\n6️⃣ Free Giveaway - DeepSeek V4 Pro 30 days\n\nBas price, stock, giveaway, ya order ChatGPT Plus type karein.'
    }
  });
}

async function main() {
  await seedAdmin();
  await seedCatalog();
  await seedTemplates();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
