const { getDailyPriceSummary } = require('../../services/priceAnalytics');
const { formatPriceReport } = require('../../utils/formatter');

async function showRates() {
  const rows = await getDailyPriceSummary();
  return formatPriceReport(rows);
}

module.exports = { showRates };
