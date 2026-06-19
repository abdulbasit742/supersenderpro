const definitions = [
  {
    name: 'list_campaigns',
    description: 'List all marketing campaigns for a store.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' } }, required: ['store_id'] }
  },
  {
    name: 'create_campaign',
    description: 'Create a new marketing campaign.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' }, name: { type: 'string' }, budget: { type: 'number' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } }, required: ['store_id', 'name'] }
  },
  {
    name: 'get_campaign',
    description: 'Get details of a specific campaign by its ID.',
    inputSchema: { type: 'object', properties: { campaign_id: { type: 'string' } }, required: ['campaign_id'] }
  },
  {
    name: 'add_campaign_product',
    description: 'Add a product to a marketing campaign.',
    inputSchema: { type: 'object', properties: { campaign_id: { type: 'string' }, product_id: { type: 'string' } }, required: ['campaign_id', 'product_id'] }
  }
];

const handlers = {
  list_campaigns: async (a) => global.mcpApiCall('GET', `/api/marketing/campaigns?store_id=${a.store_id}`),
  create_campaign: async (a) => global.mcpApiCall('POST', '/api/marketing/campaigns', a),
  get_campaign: async (a) => global.mcpApiCall('GET', `/api/marketing/campaigns/${a.campaign_id}`),
  add_campaign_product: async (a) => global.mcpApiCall('POST', `/api/marketing/campaigns/${a.campaign_id}/products`, { product_id: a.product_id })
};

module.exports = { definitions, handlers };
