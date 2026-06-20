// Ollama Local Provider Implementation
module.exports = {
  generate: async function(prompt, hostUrl, model, languageCode = 'und') {
    const url = `${hostUrl || 'http://localhost:11434'}/api/chat`;
    try {
      const systemPrompt = "You are a helpful AI assistant. Respond concisely and helpfully.";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: false,
          options: {
            temperature: 0.7
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.message) {
        return data.message.content;
      }
      return "AI Response: " + JSON.stringify(data);
    } catch (e) {
      console.error("Ollama Local API Error:", e.message);
      throw e;
    }
  }
};
