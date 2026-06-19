// salesAgent.js handles automated conversations focused on closing product inquiries.
async function handleSalesConversation(phone, message) {
  return {
    reply: `Hi! Thanks for reaching out. We have a wide range of premium laptops. Are you looking for a budget friendly option or high performance?`,
    shouldEscalate: false
  };
}

module.exports = { handleSalesConversation };
