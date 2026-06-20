const definitions = [
  {
    name: 'get_active_rates',
    description: 'List current product rates with optional filter by tool/plan.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Filter by tool name' },
        plan: { type: 'string', description: 'Filter by plan name' },
        dealerId: { type: 'string', description: 'Filter by dealer ID' },
        days: { type: 'number', description: 'Days back to look (default 30)' }
      }
    }
  },
  {
    name: 'update_active_rates',
    description: 'Create or update a product rate entry.',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: { type: 'string', description: 'Name of the tool (e.g. Netflix)' },
        planName: { type: 'string', description: 'Name of the plan (e.g. 1 Screen)' },
        price: { type: 'number', description: 'Price in PKR' },
        dealerId: { type: 'string', description: 'Dealer ID' },
        dealerName: { type: 'string', description: 'Dealer Name' }
      },
      required: ['toolName', 'planName', 'price']
    }
  },
  {
    name: 'parse_rates_text',
    description: 'Parse a text block of rates using the AI Tools regex engine.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Raw message/text block containing rates' }
      },
      required: ['message']
    }
  },
  {
    name: 'parse_and_save_rates_text',
    description: 'Parse a rates text block and commit all extracted rates directly to the database.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Raw rates message text' },
        dealerId: { type: 'string', description: 'Optional dealer ID' },
        groupId: { type: 'string', description: 'Optional group ID' }
      },
      required: ['message']
    }
  },
  {
    name: 'get_cheapest_rates',
    description: 'Find the absolute cheapest rates available for all products.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_profit_suggestions',
    description: 'Calculate smart profit recommendations and optimal margins for pricing.',
    inputSchema: {
      type: 'object',
      properties: {
        sellPrice: { type: 'number', description: 'Your current selling price' },
        quantity: { type: 'number', description: 'Sales quantity' },
        margin: { type: 'number', description: 'Desired margin percentage (default 20)' }
      },
      required: ['sellPrice']
    }
  },
  {
    name: 'calculate_margin_and_markup',
    description: 'Help tool to calculate markup, margin, profit and minimum sell price.',
    inputSchema: {
      type: 'object',
      properties: {
        buyPrice: { type: 'number', description: 'Cost price' },
        sellPrice: { type: 'number', description: 'Selling price' },
        margin: { type: 'number', description: 'Desired margin percentage' }
      }
    }
  }
];

const handlers = {
  get_active_rates: async (a) => {
    const q = [];
    if (a.tool) q.push(`tool=${encodeURIComponent(a.tool)}`);
    if (a.plan) q.push(`plan=${encodeURIComponent(a.plan)}`);
    if (a.dealerId) q.push(`dealerId=${encodeURIComponent(a.dealerId)}`);
    if (a.days) q.push(`days=${encodeURIComponent(a.days)}`);
    return global.mcpApiCall('GET', `/api/rates${q.length ? '?' + q.join('&') : ''}`);
  },
  update_active_rates: async (a) => global.mcpApiCall('POST', '/api/rates', a),
  parse_rates_text: async (a) => global.mcpApiCall('POST', '/api/rates/parse', { message: a.message }),
  parse_and_save_rates_text: async (a) => global.mcpApiCall('POST', '/api/rates/parse-save', a),
  get_cheapest_rates: async () => global.mcpApiCall('GET', '/api/rates/cheapest'),
  get_profit_suggestions: async (a) => {
    const q = [];
    q.push(`sellPrice=${a.sellPrice}`);
    if (a.quantity) q.push(`quantity=${a.quantity}`);
    if (a.margin) q.push(`margin=${a.margin}`);
    return global.mcpApiCall('GET', `/api/rates/profit-suggestions?${q.join('&')}`);
  },
  calculate_margin_and_markup: async (a) => {
    const q = [];
    if (a.buyPrice) q.push(`buyPrice=${a.buyPrice}`);
    if (a.sellPrice) q.push(`sellPrice=${a.sellPrice}`);
    if (a.margin) q.push(`margin=${a.margin}`);
    return global.mcpApiCall('GET', `/api/rates/calculator?${q.join('&')}`);
  }
};

module.exports = { definitions, handlers };
