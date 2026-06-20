# Setup Credential Checklist

The wizard reports a **safe** credential checklist: for each credential it returns the **env-var
name**, whether it is **required/optional**, **set/missing**, a **masked status**, a **purpose**,
and a docs link. It NEVER returns or logs the secret value.

## Groups
WhatsApp Cloud API · Meta/Facebook/Instagram · LinkedIn · TikTok · Telegram · Google Sheets · n8n ·
AI Providers (OpenAI/Anthropic/Gemini/DeepSeek/OpenRouter/Groq) · Voice (ElevenLabs/OpenAI Audio/
Deepgram/Azure/AWS/Google Speech) · Payments (IMAP) · Ecommerce platforms · Datastores (Redis/Postgres) ·
Security (JWT/encryption).

## API
`GET /api/unified-setup/credentials` → `{ checklist, summary }`. The summary lists
`requiredMissing` env-var names only.

## What still needs manual credentials
These require the owner to obtain keys from the provider and add them to `.env` (never committed):
WhatsApp Cloud token + phone number id, Meta/LinkedIn/TikTok OAuth tokens, payment IMAP login,
AI provider API keys, and (optionally) voice provider keys.
