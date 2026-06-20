const definitions = [
  {
    name: 'create_action_draft',
    description: 'Create a safe approval-queue draft for WhatsApp, broadcast, or social posting. Does not send anything.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'whatsapp_message, broadcast, or social_post.' },
        title: { type: 'string', description: 'Draft title/description' },
        payload: { type: 'object', description: 'Action parameters' }
      },
      required: ['type', 'payload']
    }
  },
  {
    name: 'list_action_drafts',
    description: 'List action drafts waiting for local review.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'pending, approved, executed, rejected, failed, or all.' },
        type: { type: 'string', description: 'Filter by action type' },
        limit: { type: 'number', description: 'Max drafts to return' }
      }
    }
  },
  {
    name: 'reject_action_draft',
    description: 'Reject a pending action draft without sending anything.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Draft ID' },
        reason: { type: 'string', description: 'Reason for rejection' }
      },
      required: ['id']
    }
  },
  {
    name: 'approve_action_draft',
    description: 'Approve and execute a draft through SuperSender. Server must have MCP_ALLOW_ACTIONS=1.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Draft ID' }
      },
      required: ['id']
    }
  }
];

const handlers = {
  create_action_draft: async (a) => global.mcpApiCall('POST', '/api/mcp/action-drafts', {
    type: a.type,
    title: a.title,
    payload: a.payload
  }),
  list_action_drafts: async (a) => {
    const params = [];
    if (a.status) params.push(`status=${encodeURIComponent(a.status)}`);
    if (a.type) params.push(`type=${encodeURIComponent(a.type)}`);
    if (a.limit) params.push(`limit=${encodeURIComponent(a.limit)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return global.mcpApiCall('GET', `/api/mcp/action-drafts${query}`);
  },
  reject_action_draft: async (a) => global.mcpApiCall('POST', `/api/mcp/action-drafts/${encodeURIComponent(a.id)}/reject`, {
    reason: a.reason || 'Rejected from MCP'
  }),
  approve_action_draft: async (a) => global.mcpApiCall('POST', `/api/mcp/action-drafts/${encodeURIComponent(a.id)}/approve`, {})
};

module.exports = { definitions, handlers };
