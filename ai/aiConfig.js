export const AI_CONFIG = {
    activeProvider: 'groq',
    providers: {
        groq: {
            enabled: true,
            apiKey: process.env.GROQ_API_KEY || ''
        },
        openai: {
            enabled: false,
            apiKey: ''
        },
        claude: {
            enabled: false,
            apiKey: ''
        },
        gemini: {
            enabled: false,
            apiKey: ''
        }
    }
};
