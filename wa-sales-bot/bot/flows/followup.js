function daysBetween(a, b) {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000));
}

function buildFollowupMessage(order, phase) {
  if (phase === 'day1') {
    return `😊 ${order.customer_name || 'Sir/Madam'}, sab theek chal raha hai?\nOrder: *${order.order_id}*\nAgar koi issue ho to isi chat mein *issue* likhein.`;
  }
  if (phase === 'review') {
    return `🌟 Agar service pasand aayi ho to short review ya testimonial bhej dein.\nOrder: *${order.order_id}*`;
  }
  if (phase === 'renewal') {
    return `🔁 Renewal reminder\n*${order.tool_name} ${order.plan_name}* ki renewal date qareeb hai.\nAaj ki latest price ke liye *rates* ya *renew* reply karein.`;
  }
  if (phase === 'urgency') {
    return `⏰ Aap ki subscription khatam honay wali hai!\nOrder: *${order.order_id}*\nRenew karwana ho to isi chat mein reply karein.`;
  }
  return '';
}

module.exports = {
  daysBetween,
  buildFollowupMessage
};
