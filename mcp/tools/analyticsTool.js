const definitions = [
  {
    name: 'get_sales_analytics',
    description: 'Retrieve sales analytics for a store over a date range, including total revenue, number of orders, and top-selling products.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string', description: 'Store identifier' },
        start_date: { type: 'string', format: 'date', description: 'Start date for analytics' },
        end_date: { type: 'string', format: 'date', description: 'End date for analytics' }
      },
      required: ['store_id', 'start_date', 'end_date']
    }
  },
  {
    name: 'get_customer_lifetime_value',
    description: 'Calculate the lifetime value (LTV) of a specific customer based on their purchase history.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer identifier' }
      },
      required: ['customer_id']
    }
  }
];

module.exports = { definitions };
