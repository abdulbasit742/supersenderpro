const definitions = [
  {
    name: 'list_stock',
    description: 'List stock levels for all products in a store.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' } }, required: ['store_id'] }
  },
  {
    name: 'update_stock',
    description: 'Update stock quantity for a specific product.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string' },
        product_id: { type: 'string' },
        stock: { type: 'number' }
      },
      required: ['store_id', 'product_id', 'stock']
    }
  }
];

const handlers = {
  list_stock: async (a) => global.mcpApiCall('GET', `/api/stores/${a.store_id}/stock`),
  update_stock: async (a) => global.mcpApiCall('PUT', `/api/stores/${a.store_id}/products/${a.product_id}/stock`, { stock: a.stock })
};

module.exports = { definitions, handlers };
