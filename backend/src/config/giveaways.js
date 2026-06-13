const path = require('path');

const GIVEAWAYS = [
  {
    id: 'moclaw-deepseek-v4-free-30-days',
    provider: 'Moclaw AI',
    title: 'Moclaw AI - DeepSeek V4 Pro Free Trial',
    tool: 'DeepSeek V4 Pro',
    durationDays: 30,
    credits: 1000,
    link: 'https://moclaw.ai',
    publicImage: '/assets/giveaways/moclaw-deepseek-v4-free-trial.png',
    imagePath: path.resolve(__dirname, '../../assets/giveaways/moclaw-deepseek-v4-free-trial.png'),
    terms: [
      'DeepSeek V4 only',
      'No card required',
      'Every new account gets 1,000 free credits'
    ],
    steps: [
      'Register with your email',
      'Scroll down and click on Free Trial',
      'Enjoy 30 days free'
    ]
  }
];

function primaryGiveaway() {
  return GIVEAWAYS[0];
}

function formatGiveawayMessage(giveaway = primaryGiveaway()) {
  return [
    `🎁 *${giveaway.provider} Giveaway*`,
    '',
    `🔥 *${giveaway.tool} free for ${giveaway.durationDays} days*`,
    `💳 ${giveaway.credits.toLocaleString()} credits included`,
    '✅ No card required',
    '🤖 DeepSeek V4 only',
    '',
    '*Claim steps:*',
    ...giveaway.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `🔗 Link: ${giveaway.link}`,
    '',
    'Agar paid AI tools plans bhi dekhne hain to *plans* ya *price* reply karein.'
  ].join('\n');
}

function giveawayImagePath(giveaway = primaryGiveaway()) {
  return giveaway.imagePath;
}

module.exports = {
  GIVEAWAYS,
  primaryGiveaway,
  formatGiveawayMessage,
  giveawayImagePath
};
