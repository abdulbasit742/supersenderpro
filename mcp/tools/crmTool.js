const definitions = [
  {
    name: 'get_customers',
    description: 'Get customers from store CRM. Can filter by tier or segment.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string' },
        tier:     { type: 'string', description: 'Filter by tier: Bronze|Silver|Gold|VIP' },
        segment:  { type: 'string', description: 'Filter: all|new|inactive|repeat|vip' },
        limit:    { type: 'number' },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'get_customer_profile',
    description: 'Get full customer profile including orders, notes, and interaction history.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string' },
        phone:    { type: 'string', description: 'Customer phone number' },
      },
      required: ['store_id', 'phone'],
    },
  },
  {
    name: 'add_customer_note',
    description: 'Add a note to a customer profile.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string' },
        phone:    { type: 'string' },
        note:     { type: 'string', description: 'Note text to add' },
      },
      required: ['store_id', 'phone', 'note'],
    },
  },
  {
    name: 'tag_customer',
    description: 'Add a tag to a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string' },
        phone:    { type: 'string' },
        tag:      { type: 'string', description: 'Tag to add (e.g. bulk-buyer, vip, problematic)' },
      },
      required: ['store_id', 'phone', 'tag'],
    },
  },
  {
    name: 'get_crm_stats',
    description: 'Get CRM overview statistics — customer counts, tiers, LTV.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' } }, required: ['store_id'] },
  },
  {
    name: 'schedule_followup',
    description: 'Schedule an automatic follow-up message to a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id:     { type: 'string' },
        phone:        { type: 'string' },
        message:      { type: 'string' },
        scheduled_at: { type: 'string', description: 'ISO date-time string (PKT)' },
      },
      required: ['store_id', 'phone', 'message'],
    },
  },
  {
    name: 'export_customers',
    description: 'Get customer list as structured data for export.',
    inputSchema: { type: 'object', properties: { store_id: { type: 'string' } }, required: ['store_id'] },
  },
];

const handlers = {
  get_customers: async (a) =>
    global.mcpApiCall('GET', `/api/stores/${a.store_id}/crm/customers?segment=${a.segment||'all'}&limit=${a.limit||20}${a.tier?`&tier=${a.tier}`:''}`),

  get_customer_profile: async (a) =>
    global.mcpApiCall('GET', `/api/stores/${a.store_id}/crm/customers/${a.phone}`),

  add_customer_note: async (a) =>
    global.mcpApiCall('POST', `/api/stores/${a.store_id}/crm/customers/${a.phone}/notes`, { text: a.note }),

  tag_customer: async (a) =>
    global.mcpApiCall('POST', `/api/stores/${a.store_id}/crm/customers/${a.phone}/tags`, { tag: a.tag }),

  get_crm_stats: async (a) =>
    global.mcpApiCall('GET', `/api/stores/${a.store_id}/crm/stats`),

  schedule_followup: async (a) =>
    global.mcpApiCall('POST', `/api/stores/${a.store_id}/crm/followups`, { phone: a.phone, message: a.message, scheduledAt: a.scheduled_at }),

  export_customers: async (a) =>
    global.mcpApiCall('GET', `/api/stores/${a.store_id}/crm/customers?limit=1000`),
};

module.exports = { definitions, handlers };
