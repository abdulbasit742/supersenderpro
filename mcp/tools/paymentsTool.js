const definitions = [
  {
    name: 'get_mobile_wallet_notifications',
    description: 'Get latest EasyPaisa/JazzCash mobile wallet SMS notifications received via email parser.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max notifications to load' }
      }
    }
  },
  {
    name: 'verify_payment_screenshot',
    description: 'Verify a customer payment screenshot or raw text transaction notification.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'Txn ID or reference number' },
        amount: { type: 'number', description: 'Expected payment amount' },
        senderPhone: { type: 'string', description: 'Optional sender mobile number' },
        walletType: { type: 'string', description: 'easypaisa, jazzcash, bank_transfer' }
      },
      required: ['transactionId', 'amount']
    }
  },
  {
    name: 'manual_verify_payment',
    description: 'Manually verify and approve a specific wallet transaction and link it to an order.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'Txn ID or reference number' },
        orderId: { type: 'string', description: 'Target order ID to fulfill' }
      },
      required: ['transactionId', 'orderId']
    }
  }
];

const handlers = {
  get_mobile_wallet_notifications: async (a) => global.mcpApiCall('GET', `/api/payments/notifications${a.limit ? '?limit=' + a.limit : ''}`),
  verify_payment_screenshot: async (a) => global.mcpApiCall('POST', '/api/payments/verify', a),
  manual_verify_payment: async (a) => global.mcpApiCall('POST', '/api/payments/manual-verify', {
    transactionId: a.transactionId,
    orderId: a.orderId
  })
};

module.exports = { definitions, handlers };
