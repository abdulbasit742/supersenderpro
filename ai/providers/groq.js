// Native Groq Implementation with Language Support
module.exports = {
  generateWithGroq: async function(prompt, apiKey, model, languageCode = 'und') {
    if (!apiKey) throw new Error("Groq API Key is missing");
    try {
      // Determine system prompt based on detected language
      let systemPrompt = "You are a helpful AI assistant. Respond concisely and helpfully.";
      
      // If we have language-specific instructions, we could enhance the system prompt here
      // For now, we'll rely on the prompt containing language instructions
      
      // Simulate fetch to Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 250
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if(data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      }
      return "AI Response: " + JSON.stringify(data);
    } catch (e) {
      console.error("Groq API Error:", e.message);
      return "Error reaching Groq AI: " + e.message;
    }
  }
};
