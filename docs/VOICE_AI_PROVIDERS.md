# Voice AI Providers

The provider registry (`lib/voiceAI/providerRegistry.js`) describes every supported TTS/STT
provider. **No provider value/secret is ever exposed** — only whether a key is present.

| id | label | capabilities | key needed | clone | risk |
|---|---|---|---|---|---|
| mock_dry_run | Mock (Dry-Run) | TTS, STT, voiceover | no | no | none |
| elevenlabs | ElevenLabs | TTS, voiceover, clone* | yes | yes* | medium |
| openai_audio | OpenAI Audio | TTS, STT | yes | no | low |
| google_speech | Google Speech | TTS, STT, translation | yes | no | low |
| azure_speech | Azure Speech | TTS, STT | yes | no | low |
| aws_polly | AWS Polly | TTS | yes | no | low |
| deepgram | Deepgram | STT | yes | no | low |
| whisper_local | Whisper (Local) | STT | no | no | none |
| browser_speech | Browser Speech API | TTS, STT | no | no | none |
| manual_upload | Manual Upload | TTS, STT, cleanup | no | no | none |

\* Voice cloning is disabled by default and needs explicit consent + `VOICE_AI_ALLOW_VOICE_CLONING=true`.

## Default provider
`VOICE_AI_DEFAULT_PROVIDER=mock_dry_run`. The mock provider never calls the network and returns
deterministic dry-run previews.

## Enabling a live provider (later)
1. Add the API key to `.env` (never commit it).
2. Set `VOICE_AI_DRY_RUN=false` and the matching `VOICE_AI_ALLOW_LIVE_TTS` / `_STT` flag.
3. Record per-subject `externalProviderOptIn` consent.
4. Implement the real HTTP call in the provider adapter (the safe build intentionally leaves the
   live call unimplemented so nothing goes out by accident).
