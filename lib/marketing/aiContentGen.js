const aiBrain = require('../../ai/aiBrain');

async function generateMarketingContent(prompt, type = 'promo') {
  const systemContext = `You are a high-converting WhatsApp copywriter. Generate a persuasive ${type} message. Use emojis, clear spacing, and include a call to action. Prompt: ${prompt}`;
  try {
    const generated = await aiBrain.processPrompt(systemContext);
    return generated;
  } catch (err) {
    console.error('[aiContentGen] Failed to generate copy via AI:', err.message);
    return `✨ *Special Offer!* ✨\n\nCheck out our latest arrivals! Use code *SAVE10* for 10% off.`;
  }
}

module.exports = { generateMarketingContent };

