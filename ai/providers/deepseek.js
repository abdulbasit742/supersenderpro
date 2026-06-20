// DeepSeek Provider Implementation
module.exports = {
  generate: async function(prompt, apiKey, model, languageCode = 'und') {
    if (!apiKey) throw new Error("DeepSeek API Key is missing");
    try {
      const systemPrompt = "You are a helpful AI assistant. Respond concisely and helpfully.";
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return "AI Response: " + JSON.stringify(data);
    } catch (e) {
      console.error("DeepSeek API Error:", e.message);
      throw e;
    }
  }
};
