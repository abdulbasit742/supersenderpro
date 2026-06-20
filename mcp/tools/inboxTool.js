const definitions = [
  {
    name: 'list_inbox',
    description: 'List latest unified inbox messages.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Filter by source, e.g. whatsapp, instagram, facebook' },
        limit: { type: 'number', description: 'Max messages to return (default 50)' }
      }
    }
  },
  {
    name: 'reply_inbox',
    description: 'Reply to a customer via the unified inbox reply endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Recipient phone number or ID' },
        message: { type: 'string', description: 'Message content' },
        source: { type: 'string', description: 'Source platform, e.g. whatsapp, instagram, facebook (default whatsapp)' }
      },
      required: ['number', 'message']
    }
  }
];

const handlers = {
  list_inbox: async (a) => {
    let rows = await global.mcpApiCall('GET', '/api/inbox');
    if (rows && rows.error) return rows;
    if (Array.isArray(rows)) {
      if (a.source) {
        rows = rows.filter(row => String(row.source || '').toLowerCase() === String(a.source).toLowerCase());
      }
      const limit = a.limit || 50;
      return rows.slice(0, limit);
    }
    return rows;
  },
  reply_inbox: async (a) => global.mcpApiCall('POST', '/api/inbox/reply', {
    number: a.number,
    message: a.message,
    source: a.source || 'whatsapp'
  })
};

module.exports = { definitions, handlers };
