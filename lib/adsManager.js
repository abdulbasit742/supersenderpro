// adsManager.js – central façade for ad platform operations

const path = require('path');

// Dynamically require platform modules
function getPlatformModule(platform) {
  switch (platform) {
    case 'google':
      return require(path.join(__dirname, 'ads', 'googleAds'));
    case 'facebook':
    case 'instagram': // Instagram uses same Facebook module
      return require(path.join(__dirname, 'ads', 'facebookAds'));
    default:
      throw new Error(`Unsupported ad platform: ${platform}`);
  }
}

module.exports = {
  async createCampaign({ storeId, platform, campaignData }) {
    const mod = getPlatformModule(platform);
    return await mod.createCampaign(storeId, campaignData);
  },

  async updateCampaign({ storeId, platform, campaignId, updateData }) {
    const mod = getPlatformModule(platform);
    return await mod.updateCampaign(storeId, campaignId, updateData);
  },

  async fetchReport({ storeId, platform, params }) {
    const mod = getPlatformModule(platform);
    return await mod.fetchReport(storeId, params);
  },

  // Called when an order is completed to attribute conversion
  async integrateOrder({ storeId, order }) {
    // Simple example: forward to each platform's conversion handler
    const platforms = ['google', 'facebook'];
    for (const p of platforms) {
      try {
        const mod = getPlatformModule(p);
        if (typeof mod.recordConversion === 'function') {
          await mod.recordConversion(storeId, order);
        }
      } catch (e) {
        console.warn(`Ads integration error for ${p}:`, e.message);
      }
    }
  },
};
