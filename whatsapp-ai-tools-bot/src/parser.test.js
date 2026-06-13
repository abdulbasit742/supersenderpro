const { extractRatesFromMessage } = require('./parser');

const sample = `
ChatGPT Plus 1850
claude: 1700
mid basic = 1200
Gemini Advanced 2.5k
Cursor pro - 2100
`;

console.log(extractRatesFromMessage(sample));
