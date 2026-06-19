const definitions = [
  {
    name: 'list_orders',
    description: 'List all orders for a given store, optionally filtered by status or date range.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string', description: 'Store identifier' },
        status: { type: 'string', description: 'Order status filter (e.g., pending, shipped)'} ,
        start_date: { type: 'string', format: 'date', description: 'Start date filter' },
        end_date: { type: 'string', format: 'date', description: 'End date filter' }
      },
      required: ['store_id']
    }
  },
  {
    name: 'get_order',
    description: 'Retrieve detailed information for a specific order by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Unique order identifier' }
      },
      required: ['order_id']
    }
  }
];

module.exports = { definitions };
