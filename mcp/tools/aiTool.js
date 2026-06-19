const definitions = [
  {
    name: 'run_ai_action',
    description: 'Execute a custom AI action defined in the SuperSenderPro AI system.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Name of the AI action to run' },
        params: { type: 'object', description: 'Parameters for the AI action' }
      },
      required: ['action']
    }
  },
  {
    name: 'query_ai',
    description: 'Send a query to the AI brain and get a response.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt text for the AI' }
      },
      required: ['prompt']
    }
  }
];

const handlers = {
  run_ai_action: async (a) => global.mcpApiCall('POST', `/api/ai/actions/${a.action}`, a.params || {}),
  query_ai: async (a) => global.mcpApiCall('POST', '/api/ai/query', { prompt: a.prompt })
};

module.exports = { definitions, handlers };
