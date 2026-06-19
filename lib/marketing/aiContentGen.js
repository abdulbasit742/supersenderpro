const { aiBrain } = require('../../ai/aiBrain');

async function generateMarketingContent(prompt, type = 'promo') {
  // Leverage existing aiBrain helper or fallback to simple local generations
  const defaultText = `✨ Special Offer! ✨\nCheck out our latest arrivals! Use code SAVE10 for 10% off.`;
  return defaultText;
}

module.exports = { generateMarketingContent };
