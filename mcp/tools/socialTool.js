const definitions = [
  {
    name: 'list_social_accounts',
    description: 'List connected Facebook, Instagram, LinkedIn, TikTok/social accounts.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'publish_social_post',
    description: 'Publish a text/media post through the configured Social Hub account.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'facebook, instagram, linkedin, tiktok' },
        message: { type: 'string', description: 'Post caption/text content' },
        imageUrl: { type: 'string', description: 'Optional image URL' },
        videoUrl: { type: 'string', description: 'Optional video URL' },
        accountId: { type: 'string', description: 'Optional social account ID' }
      },
      required: ['platform', 'message']
    }
  }
];

const handlers = {
  list_social_accounts: async () => global.mcpApiCall('GET', '/api/social/accounts'),
  publish_social_post: async (a) => global.mcpApiCall('POST', '/api/social/publish', {
    platform: a.platform,
    message: a.message,
    imageUrl: a.imageUrl,
    videoUrl: a.videoUrl,
    accountId: a.accountId
  })
};

module.exports = { definitions, handlers };
