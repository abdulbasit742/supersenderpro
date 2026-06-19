const definitions = [
  {
    name: 'send_whatsapp',
    description: 'Send a WhatsApp message to any Pakistan number.',
    inputSchema: {
      type: 'object',
      properties: {
        phone:   { type: 'string', description: 'Phone number (923XXXXXXXXX format)' },
        message: { type: 'string', description: 'Message text to send' },
      },
      required: ['phone', 'message'],
    },
  },
  {
    name: 'send_whatsapp_image',
    description: 'Send a WhatsApp image with optional caption.',
    inputSchema: {
      type: 'object',
      properties: {
        phone:     { type: 'string' },
        image_url: { type: 'string', description: 'Public URL of the image' },
        caption:   { type: 'string', description: 'Optional caption text' },
      },
      required: ['phone', 'image_url'],
    },
  },
  {
    name: 'get_bot_status',
    description: 'Check WhatsApp bot connection status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'send_broadcast',
    description: 'Send a WhatsApp broadcast to a customer segment.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string' },
        segment:  { type: 'string', description: 'Segment: all|vip|gold|silver|new|inactive' },
        message:  { type: 'string' },
      },
      required: ['store_id', 'segment', 'message'],
    },
  },
  {
    name: 'get_recent_messages',
    description: 'Get recent WhatsApp messages received.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Number of messages (default 10)' } },
      required: [],
    },
  },
];

const handlers = {
  send_whatsapp: async (a) =>
    global.mcpApiCall('POST', '/api/whatsapp/send', { phone: a.phone, message: a.message }),

  send_whatsapp_image: async (a) =>
    global.mcpApiCall('POST', '/api/whatsapp/send-image', { phone: a.phone, imageUrl: a.image_url, caption: a.caption }),

  get_bot_status: async () =>
    global.mcpApiCall('GET', '/api/health'),

  send_broadcast: async (a) =>
    global.mcpApiCall('POST', `/api/stores/${a.store_id}/crm/broadcast`, { segment: a.segment, message: a.message }),

  get_recent_messages: async (a) =>
    global.mcpApiCall('GET', `/api/whatsapp/messages?limit=${a.limit || 10}`),
};

module.exports = { definitions, handlers };
