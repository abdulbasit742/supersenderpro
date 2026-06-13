const prisma = require('../../services/prisma');
const env = require('../../config/env');
const { normalizePhone } = require('../../utils/phone');
const { sendWhatsAppMessage } = require('../../whatsapp/baileysClient');

function serviceMenu() {
  return [
    '🤖 *Bot/AI Service Menu*',
    '',
    '1. Basic WhatsApp Bot — Rs 15,000',
    '   Auto-replies, menu, FAQ handling',
    '',
    '2. AI Agent Bot — Rs 35,000',
    '   NLP, smart replies, CRM integration',
    '',
    '3. Full Business System — Rs 75,000',
    '   Complete automation like this one',
    '',
    '4. Custom Quote',
    '   Share your requirements',
    '',
    'Please reply: business type, messages/day, needed features, budget.'
  ].join('\n');
}

async function captureRequirement({ phone, name = 'Lead', message }) {
  const normalized = normalizePhone(phone);
  const customer = await prisma.customer.upsert({
    where: { whatsapp: normalized },
    update: { name, tags: ['bot-service-lead'], notes: message },
    create: { whatsapp: normalized, name, tags: ['bot-service-lead'], notes: message }
  });
  const alert = [
    '🤖 BOT SERVICE LEAD',
    `Customer: ${name} ${normalized}`,
    `Requirement: ${message}`,
    'Follow up with quote.'
  ].join('\n');
  await prisma.adminAlert.create({
    data: { type: 'bot_service_lead', title: `Bot service lead ${normalized}`, message: alert, severity: 'success', payload: { customerId: customer.id, message } }
  }).catch(() => null);
  if (env.adminNumber) {
    try {
      await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, message: alert });
    } catch (error) {
      console.error('[botService:captureRequirement]', error);
    }
  }
  return { success: true, customer, reply: 'Requirements receive ho gayi hain. Admin aap ko quote ke sath contact karega.' };
}

module.exports = { serviceMenu, captureRequirement };
