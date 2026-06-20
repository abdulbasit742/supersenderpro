# Voice AI — Ecommerce Voiceover

Connects existing ecommerce/order data (passed in as plain objects) to voice drafts. It does **not**
rebuild the ecommerce hub.

## Helpers (`lib/voiceAI/ecommerceVoice.js`)
- `productExplanation(product)`
- `orderConfirmation(order)`
- `paymentReminder(order)`
- `deliveryUpdate(order)`
- `abandonedCart(cart)`
- `flashSale(deal)`

## Product / reel voiceover scripts (`lib/voiceAI/productVoiceover.js`)
```js
const vo = require('./lib/voiceAI/productVoiceover');
vo.script({ product: 'Wireless Earbuds', price: 2999, highlight: 'best seller', language: 'roman_urdu' });
// -> { type, language, text, preview, dryRun: true }
```

## Order lifecycle → queued draft (`lib/voiceAI/orderVoiceAssistant.js`)
```js
const oa = require('./lib/voiceAI/orderVoiceAssistant');
oa.fromOrderEvent({ event: 'payment_pending', order: { amount: 1500 }, customerId: 'c1' });
// creates an approval_pending, dry-run voice draft
```

## API
- `POST /api/voice-ai/ecommerce/voiceover` — product voiceover script
- `POST /api/voice-ai/channel/voiceover-draft` — WhatsApp channel voiceover draft
- `POST /api/voice-ai/social/voiceover-draft` — Facebook/Instagram/LinkedIn/TikTok/reels draft

All return **drafts / manual packets** only; nothing is posted live.

## What not to commit
Never commit `.env`, real API keys, `data/*.json` runtime files, audio recordings, logs, uploads,
session/auth folders, or `node_modules`. These are already covered by `.gitignore`.
