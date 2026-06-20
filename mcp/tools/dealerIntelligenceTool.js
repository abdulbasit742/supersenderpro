const definitions = [
  {
    name: 'get_dealer_intelligence_rates',
    description: 'List parsed dealer rates from WhatsApp groups. Filter by tool, plan, or trust status.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Filter by tool slug (e.g., chatgpt, claude)' },
        plan: { type: 'string', description: 'Filter by plan slug' },
        status: { type: 'string', description: 'Filter by trust status' },
        limit: { type: 'number', description: 'Max entries to return (default 300)' }
      }
    }
  },
  {
    name: 'parse_dealer_message',
    description: 'Parse raw WhatsApp text rates list and save it to the intelligence database.',
    inputSchema: {
      type: 'object',
      properties: {
        dealerNumber: { type: 'string', description: 'Phone number of the dealer' },
        dealerName: { type: 'string', description: 'Optional name of the dealer' },
        groupId: { type: 'string', description: 'Optional source WhatsApp group ID' },
        groupName: { type: 'string', description: 'Optional source group name' },
        message: { type: 'string', description: 'Raw message text containing the rates' }
      },
      required: ['dealerNumber', 'message']
    }
  },
  {
    name: 'get_trusted_dealers',
    description: 'List all trusted dealers and their trust scores.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_trusted_dealer',
    description: 'Add or update a trusted dealer in the system.',
    inputSchema: {
      type: 'object',
      properties: {
        dealerCode: { type: 'string', description: 'Short code for dealer (e.g. AB_DEV)' },
        dealerName: { type: 'string', description: 'Full name' },
        dealerNumber: { type: 'string', description: 'Phone number' },
        trustScore: { type: 'number', description: 'Trust score (0-100)' }
      },
      required: ['dealerCode', 'dealerName', 'dealerNumber']
    }
  },
  {
    name: 'get_scammers',
    description: 'List flagged blacklisted scammers.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max scammers to return' }
      }
    }
  },
  {
    name: 'flag_scammer',
    description: 'Flag and add a number to the scammers blacklist database.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Scammer phone number' },
        reason: { type: 'string', description: 'Reason for flagging' },
        evidenceMessage: { type: 'string', description: 'Evidence chat text' }
      },
      required: ['number', 'reason']
    }
  },
  {
    name: 'get_dealer_by_code',
    description: 'Get details of a dealer by their short code.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Dealer short code' }
      },
      required: ['code']
    }
  },
  {
    name: 'get_best_rate_for_tool',
    description: 'Get the absolute best/cheapest dealer rate for a specific tool.',
    inputSchema: {
      type: 'object',
      properties: {
        toolSlug: { type: 'string', description: 'Tool name slug (e.g. chatgpt, claude)' }
      },
      required: ['toolSlug']
    }
  },
  {
    name: 'compare_dealer_prices',
    description: 'Compare rates for a specific tool across all dealers.',
    inputSchema: {
      type: 'object',
      properties: {
        toolSlug: { type: 'string', description: 'Tool name slug' }
      },
      required: ['toolSlug']
    }
  },
  {
    name: 'get_price_trend',
    description: 'Get historical price trend and timeline data for a tool.',
    inputSchema: {
      type: 'object',
      properties: {
        toolSlug: { type: 'string', description: 'Tool name slug' },
        days: { type: 'number', description: 'Days back to query (default 30)' }
      },
      required: ['toolSlug']
    }
  }
];

const handlers = {
  get_dealer_intelligence_rates: async (a) => {
    const q = [];
    if (a.tool) q.push(`tool=${encodeURIComponent(a.tool)}`);
    if (a.plan) q.push(`plan=${encodeURIComponent(a.plan)}`);
    if (a.status) q.push(`status=${encodeURIComponent(a.status)}`);
    if (a.limit) q.push(`limit=${encodeURIComponent(a.limit)}`);
    return global.mcpApiCall('GET', `/api/dealer-intelligence/rates${q.length ? '?' + q.join('&') : ''}`);
  },
  parse_dealer_message: async (a) => global.mcpApiCall('POST', '/api/dealer-intelligence/parse-message', {
    dealerNumber: a.dealerNumber,
    dealerName: a.dealerName || '',
    groupId: a.groupId || '',
    groupName: a.groupName || '',
    messageText: a.message
  }),
  get_trusted_dealers: async () => global.mcpApiCall('GET', '/api/dealer-intelligence/trusted'),
  add_trusted_dealer: async (a) => global.mcpApiCall('POST', '/api/dealer-intelligence/trusted', a),
  get_scammers: async (a) => global.mcpApiCall('GET', `/api/dealer-intelligence/scammers${a.limit ? '?limit=' + a.limit : ''}`),
  flag_scammer: async (a) => global.mcpApiCall('POST', '/api/dealer-intelligence/scammers', a),
  get_dealer_by_code: async (a) => global.mcpApiCall('GET', `/api/dealer-intelligence/dealer/${encodeURIComponent(a.code)}`),
  get_best_rate_for_tool: async (a) => global.mcpApiCall('GET', `/api/dealer-intelligence/best/${encodeURIComponent(a.toolSlug)}`),
  compare_dealer_prices: async (a) => global.mcpApiCall('GET', `/api/dealer-intelligence/compare/${encodeURIComponent(a.toolSlug)}`),
  get_price_trend: async (a) => global.mcpApiCall('GET', `/api/dealer-intelligence/price-trend/${encodeURIComponent(a.toolSlug)}${a.days ? '?days=' + a.days : ''}`)
};

module.exports = { definitions, handlers };
