const entries = [
  {
    keywords: ['payment', 'jazzcash', 'easypaisa', 'bank', 'pay'],
    answer: 'Payment JazzCash, Easypaisa aur bank transfer se accepted hai. Screenshot bhejne ke baad verification hoti hai.'
  },
  {
    keywords: ['delivery', 'time', 'kitni dair', 'kab milega'],
    answer: 'Payment verify hone ke baad delivery normally 5-20 minutes me hoti hai, stock available hona zaroori hai.'
  },
  {
    keywords: ['warranty', 'replacement', 'support'],
    answer: 'Warranty account me 1x replacement aur maximum 2x issue resolution milti hai. Limit ke baad further claim accept nahi hota.'
  },
  {
    keywords: ['private', 'shared'],
    answer: 'Private account shared login hota hai. Rs 999 limited time offer selected plans par available hai. Warranty included nahi hoti.'
  },
  {
    keywords: ['non warranty', 'non-warranty', 'claim'],
    answer: 'Non-warranty account low price hota hai. Purchase ke baad koi claim, replacement ya support guarantee accept nahi hoti.'
  },
  {
    keywords: ['refund', 'return'],
    answer: 'Digital subscription delivery ke baad refund available nahi hota. Issue warranty policy ke mutabiq handle hota hai.'
  },
  {
    tool: 'chatgpt',
    keywords: ['chatgpt', 'gpt', 'activation', 'login'],
    answer: 'ChatGPT activation: provided email/password se login karein, recovery settings change na karein, unusual prompt ka screenshot support ko bhejein.'
  },
  {
    tool: 'claude',
    keywords: ['claude', 'activation', 'login'],
    answer: 'Claude activation: credentials se login karein, VPN/location bar bar change na karein, access verify kar ke screenshot safe rakhein.'
  },
  {
    tool: 'midjourney',
    keywords: ['midjourney', 'discord', 'activation'],
    answer: 'Midjourney activation Discord instructions ke through hoti hai. Provided account/link instructions exactly follow karein.'
  },
  {
    tool: 'cursor',
    keywords: ['cursor', 'activation'],
    answer: 'Cursor Pro use karne ke liye provided account se Cursor app me login karein aur subscription status verify karein.'
  },
  {
    tool: 'gemini',
    keywords: ['gemini', 'advanced', 'google'],
    answer: 'Gemini Advanced Google account ke through access hota hai. Login ke baad Gemini Advanced status verify karein.'
  }
];

function scoreEntry(query, entry) {
  const lower = String(query || '').toLowerCase();
  const hits = entry.keywords.filter((word) => lower.includes(word.toLowerCase())).length;
  return hits ? hits / entry.keywords.length : 0;
}

function getAnswer(query = '') {
  let best = { confidence: 0, answer: '' };
  for (const entry of entries) {
    const confidence = scoreEntry(query, entry);
    if (confidence > best.confidence) best = { confidence, answer: entry.answer, entry };
  }
  return best.confidence >= 0.6 ? best : { confidence: best.confidence, answer: '' };
}

module.exports = { entries, getAnswer };
