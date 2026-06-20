// Google Gemini Provider Implementation
module.exports = {
  generate: async function(prompt, apiKey, model, languageCode = 'und') {
    if (!apiKey) throw new Error("Gemini API Key is missing");
    try {
      const selectedModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const systemPrompt = "You are a helpful AI assistant. Respond concisely and helpfully.";
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\nUser request: ${prompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
      }
      return "AI Response: " + JSON.stringify(data);
    } catch (e) {
      console.error("Gemini API Error:", e.message);
      throw e;
    }
  }
};
