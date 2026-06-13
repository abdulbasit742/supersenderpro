const service = require('../services/priceAnalytics');

async function getBestDealer(toolSlug) {
  return service.getBestDealerByTool(toolSlug);
}

async function getDailyReport() {
  return service.getDailyPriceSummary();
}

module.exports = {
  ...service,
  getBestDealer,
  getDailyReport
};
