# Voice AI — Flow Studio Integration

This adds **voice triggers and actions** to the existing Flow Studio. It does **not** create a new
Flow Studio. Descriptors live in `lib/voiceAI/flowNodes.js` (`describe()` returns triggers + actions).

## Triggers
`voice.note_received`, `voice.transcript_ready`, `voice.intent_detected`, `voice.sentiment_negative`,
`voice.reply_drafted`, `voice.approval_needed`, `voice.approved`, `voice.generated`, `voice.failed`,
`voice.opted_out`, `ecommerce.voice_deal_ready`, `channel.voiceover_ready`.

## Actions (all safe / dry-run)
`transcribe_voice_note`, `summarize_voice_note`, `generate_voice_reply`, `create_voiceover`,
`request_admin_approval`, `send_voice_dry_run`, `notify_admin`, `create_followup_task`,
`update_customer_voice_preference`, `opt_out_voice`.

## Discover nodes
```
GET /api/voice-ai/flow-nodes
```

## Running an action
```js
const { ACTIONS } = require('./lib/voiceAI/flowNodes');
const result = await ACTIONS.generate_voice_reply({ text: 'Hello', language: 'roman_urdu' });
// result.dryRun === true unless live mode is explicitly enabled
```
