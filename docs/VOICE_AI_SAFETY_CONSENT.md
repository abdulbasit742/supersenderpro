# Voice AI Safety & Consent

This system is **consent-first and business-safe**.

## What is NOT built (by design)
Secret/hidden recording, voice cloning without consent, impersonation, spam calling, unsolicited
bulk voice messages, anti-ban/stealth automation, deepfake misuse, unauthorized use of client voices.

## Defaults
- `voiceCloneOptIn = false`
- `externalProviderOptIn = false`
- auto-send = **off** (everything needs approval)
- raw audio storage = **off**
- transcript storage = **off**
- text storage = **off**

## Consent record (`lib/voiceAI/consentStore.js`)
```
{ subjectId, subjectType, voiceMessagesOptIn, transcriptionOptIn, externalProviderOptIn,
  voiceCloneOptIn, preferredLanguage, preferredVoice, updatedAt, source, notes }
```

## Guards (`lib/voiceAI/consentGuard.js`)
- `canSendVoice(subjectId)` — needs `voiceMessagesOptIn`.
- `canUseExternalProvider(subjectId)` — needs live flag + `externalProviderOptIn`.
- `canStoreTranscript(subjectId)` — needs storage flag + `transcriptionOptIn`.
- `canUseVoiceClone(subjectId, confirmed)` — needs global clone flag + confirmed + `voiceCloneOptIn`.
  Every clone attempt is audited (`voice_clone_blocked`).

## Redaction (`lib/voiceAI/redaction.js`)
Phones, emails, long tokens, card numbers and payment references are masked before anything is
stored, logged, or returned. Smoke tests assert no PII leaks in previews.

## Opt-out
`POST /api/voice-ai/opt-out/:subjectId` or admin `!voiceoptout [customer]` clears all consent.
