# Sarcasm and Tone Detector Integration

SuperSender Pro now includes a lightweight sarcasm and tone detector adapted from the local `sarcasm-detector.zip` feature pack.

## What It Adds

- `POST /api/ai/sarcasm-detect`
  - Detects sarcastic, frustrated, or neutral tone in WhatsApp/customer text.
  - Returns score, confidence, label, sentiment risk, cues, explanation, and a safe reply.
- `POST /api/social/sarcasm-check`
  - Same analysis for comments from Facebook, Instagram, LinkedIn, TikTok, or channel replies.
  - Returns a suggested action: `auto_reply_ok`, `gentle_reply`, or `human_review`.
- Dashboard card under **AI Engine -> Sarcasm / Tone Detector**.
- Existing `POST /api/ai/suggest` now includes `sarcasm` metadata and uses tone guardrails when the customer sounds sarcastic or frustrated.

## Why It Helps

Customer support and sales replies often fail when the bot treats a sarcastic message as a normal question. This detector catches signals such as:

- Roman Urdu sarcasm: `wah wah`, `kya baat hai`, `haan haan`, `bohat acha`
- English irony markers: `oh great`, `yeah right`, `thanks a lot`
- Positive and negative wording together
- Repeated punctuation, all caps, elongated words, ellipses
- Hyperbole and repeated phrases

The output is designed for WhatsApp operators: it gives a short risk label and a safe reply that acknowledges the customer calmly.

## Example

```bash
curl -X POST http://localhost:3001/api/ai/sarcasm-detect \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Oh great, again late delivery... very helpful\"}"
```

Expected response includes:

```json
{
  "success": true,
  "sarcasm": true,
  "label": "sarcastic",
  "sentimentRisk": "high",
  "recommendedReply": "Aap bilkul right keh rahe hain..."
}
```

## Performance Notes

- No background jobs, intervals, or watchers are added.
- Analysis is in-process and rule-based.
- Input is capped at 5,000 characters to avoid dashboard or bot lag.
- No external AI/API key is required.
