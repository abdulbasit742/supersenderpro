const prisma = require('../../services/prisma');
const env = require('../../config/env');
const { normalizePhone } = require('../../utils/phone');
const { sendNewOrderAlert } = require('../../adminSystem/alerts');
const { money } = require('../../utils/formatter');
const { triggerWorkflow } = require('../../services/n8nClient');
const { getDynamicPriceForPlan } = require('../../zeroTouch/pricing');
const { updateMemoryAfterMessage } = require('../../zeroTouch/memory');

function buildPolicyWarning(accountType = 'private') {
  if (accountType === 'warranty') return 'آپ کو 1 بار replacement اور 2 بار issue resolution ملے گی۔ اس کے بعد مزید support نہیں ہوگی۔ Type CONFIRM.';
  if (accountType === 'non_warranty') return '⚠️ NON-WARRANTY: خریداری کے بعد کوئی claim نہیں ہو سکتا۔ آپ confirm کرتے ہیں؟ Type YES.';
  return 'Private account = shared login۔ Limited time price Rs 999۔ Warranty included نہیں۔ Type CONFIRM.';
}

function paymentDetails(orderId, amount) {
  return [
    `🧾 Order ID: *${orderId}*`,
    `Amount: *${money(amount)}*`,
    '',
    `JazzCash: ${env.jazzcashNumber || '-'}`,
    `Easypaisa: ${env.easypaisaNumber || '-'}`,
    `${env.bankName || 'Bank'}: ${env.bankAccount || '-'}`,
    '',
    'Payment screenshot yahin send karein.'
  ].join('\n');
}

async function createOrder({ phone, name = 'Customer', toolSlug, planSlug, accountType = 'private', quantity = 1 }) {
  const normalized = normalizePhone(phone);
  const [plan, type] = await Promise.all([
    prisma.toolPlan.findFirst({ where: { tool: { slug: toolSlug }, slug: planSlug }, include: { tool: true } }),
    prisma.accountType.findUnique({ where: { name: accountType } })
  ]);
  if (!plan || !type) return { success: false, message: 'Tool/plan/type not found.' };
  const pricing = await prisma.pricing.findFirst({ where: { planId: plan.id, accountTypeId: type.id } });
  const customer = await prisma.customer.upsert({
    where: { whatsapp: normalized },
    update: { name },
    create: { whatsapp: normalized, name }
  });
  const bestRate = await prisma.dealerRateIntelligence.findFirst({
    where: { toolSlug, planSlug, trustStatus: { not: 'scammer' } },
    orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
  });
  const orderId = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const dynamicPrice = await getDynamicPriceForPlan({ toolSlug, planSlug, accountType, customerPhone: normalized }).catch(() => null);
  const sellPrice = Number(dynamicPrice?.price || pricing?.price || plan.defaultSellPrice || 0);
  const buyPrice = Number(bestRate?.price || 0);
  const order = await prisma.businessOrder.create({
    data: {
      orderId,
      customerId: customer.id,
      toolId: plan.toolId,
      planId: plan.id,
      accountTypeId: type.id,
      quantity: Number(quantity || 1),
      sellPrice,
      buyPrice,
      profit: (sellPrice - buyPrice) * Number(quantity || 1),
      status: 'awaiting_payment',
      policySnapshot: pricing?.policySummary || type.policySummary,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    include: { customer: true, tool: true, plan: true, accountType: true }
  });
  updateMemoryAfterMessage(normalized, `Order started: ${plan.tool.name} ${plan.name}`, 'ORDER').catch(() => {});
  await sendNewOrderAlert(order);
  triggerWorkflow('order_created', order).catch(() => {});
  return { success: true, order, reply: `${buildPolicyWarning(accountType)}\n\n${paymentDetails(orderId, sellPrice * Number(quantity || 1))}` };
}

module.exports = {
  buildPolicyWarning,
  paymentDetails,
  createOrder
};
