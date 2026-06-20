// Anthropic Claude Provider Implementation
module.exports = {
  generate: async function(prompt, apiKey, model, languageCode = 'und') {
    if (!apiKey) throw new Error("Anthropic API Key is missing");
    try {
      const systemPrompt = "You are a helpful AI assistant. Respond concisely and helpfully.";
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-latest',
          messages: [
            { role: 'user', content: prompt }
          ],
          system: systemPrompt,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.content && data.content[0]) {
        return data.content[0].text;
      }
      return "AI Response: " + JSON.stringify(data);
    } catch (e) {
      console.error("Anthropic API Error:", e.message);
      throw e;
    }
  }
};
