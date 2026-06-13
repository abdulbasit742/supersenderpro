const prisma = require('../../services/prisma');
const { sendWhatsAppMessage } = require('../../whatsapp/baileysClient');

function daysAgo(days) {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

async function sendFollowupForDay(day) {
  const messages = {
    1: 'کیا سب ٹھیک ہے؟ کوئی مسئلہ ہو تو Order ID کے ساتھ بتائیں۔',
    3: 'Agar service achi lagi ho to review/screenshot testimonial share kar dein.',
    25: 'آپ کی subscription renewal قریب ہے. Same price/upgrade option ke liye reply karein.',
    28: 'آپ کی subscription ختم ہونے والی ہے! Renewal confirm karna ho to reply *renew*.'
  };
  const orders = await prisma.businessOrder.findMany({
    where: { deliveryDate: daysAgo(day), status: 'delivered' },
    include: { customer: true, tool: true, plan: true }
  });
  const sent = [];
  for (const order of orders) {
    const message = `#${order.orderId}\n${messages[day]}`;
    try {
      await sendWhatsAppMessage({ to: `${order.customer.whatsapp}@s.whatsapp.net`, message });
    } catch (error) {
      console.error('[followup:send]', error);
    }
    sent.push(order.orderId);
  }
  return sent;
}

module.exports = { sendFollowupForDay };
