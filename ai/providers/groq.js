// Native Groq Implementation with Language Support
const generate = async function(prompt, apiKey, model, languageCode = 'und') {
  if (!apiKey) throw new Error("Groq API Key is missing");
  try {
    let systemPrompt = "You are a helpful AI assistant. Respond concisely and helpfully.";
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
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
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    return "AI Response: " + JSON.stringify(data);
  } catch (e) {
    console.error("Groq API Error:", e.message);
    return "Error reaching Groq AI: " + e.message;
  }
};

module.exports = {
  generateWithGroq: generate,
  generate: generate
};
