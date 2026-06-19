const definitions = [
  {
    name: 'list_stores',
    description: 'List all stores in SuperSenderPro. Returns store names, IDs, cities, and product counts.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_store',
    description: 'Get details of a specific store by ID.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string', description: 'Store ID (slug)' } }, required: ['store_id'] },
  },
  {
    name: 'create_store',
    description: 'Create a new store for a seller.',
    inputSchema: {
      type: 'object',
      properties: {
        owner_phone: { type: 'string', description: 'Owner WhatsApp number (923XXXXXXXXX)' },
        name:        { type: 'string', description: 'Store name' },
        description: { type: 'string', description: 'Short store description' },
        city:        { type: 'string', description: 'City (e.g. Rawalpindi)' },
        category:    { type: 'string', description: 'Category: electronics|clothes|food|real-estate|education|other' },
      },
      required: ['owner_phone', 'name'],
    },
  },
  {
    name: 'list_products',
    description: 'List all products in a store.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' } }, required: ['store_id'] },
  },
  {
    name: 'add_product',
    description: 'Add a new product to a store.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id:    { type: 'string' },
        name:        { type: 'string', description: 'Product name' },
        price:       { type: 'number', description: 'Price in PKR' },
        description: { type: 'string', description: 'Product description' },
        stock:       { type: 'number', description: 'Available stock quantity' },
        category:    { type: 'string' },
      },
      required: ['store_id', 'name', 'price'],
    },
  },
  {
    name: 'update_product',
    description: 'Update product price, stock, or availability.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id:   { type: 'string' },
        product_id: { type: 'string' },
        price:      { type: 'number' },
        stock:      { type: 'number' },
        available:  { type: 'boolean' },
      },
      required: ['store_id', 'product_id'],
    },
  },
  {
    name: 'get_store_stats',
    description: 'Get store statistics — orders, revenue, views.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' } }, required: ['store_id'] },
  },
];

const handlers = {
  list_stores:    async () => global.mcpApiCall('GET', '/api/stores'),
  get_store:      async (a) => global.mcpApiCall('GET', `/api/stores/${a.store_id}`),
  create_store:   async (a) => global.mcpApiCall('POST', '/api/stores', { ownerPhone: a.owner_phone, name: a.name, description: a.description, city: a.city, category: a.category }),
  list_products:  async (a) => global.mcpApiCall('GET', `/api/stores/${a.store_id}/products`),
  add_product:    async (a) => global.mcpApiCall('POST', `/api/stores/${a.store_id}/products`, { name: a.name, price: a.price, description: a.description, stock: a.stock, category: a.category }),
  update_product: async (a) => global.mcpApiCall('PUT', `/api/stores/${a.store_id}/products/${a.product_id}`, { price: a.price, stock: a.stock, available: a.available }),
  get_store_stats: async (a) => global.mcpApiCall('GET', `/api/stores/${a.store_id}`),
};

module.exports = { definitions, handlers };
