# Voice AI Smoke Test Results

Generated: 2026-06-20T06:33:22.534Z

**18/18 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require route module | ✅ pass | loaded |
| 2 | require barrel + core modules | ✅ pass | providers=10 |
| 3 | provider registry has mock_dry_run default | ✅ pass | mock_dry_run |
| 4 | dry-run TTS preview | ✅ pass | [object Promise] |
| 5 | tts dryRun true | ✅ pass | dry-run |
| 6 | TTS preview redacts phone/email | ✅ pass | Assalam o Alaikum, call me at [REDACTED_PHONE_*567] or me***@[REDACTED_EMAIL] |
| 7 | TTS preview has no audioUrl (dry-run) | ✅ pass | null |
| 8 | dry-run STT preview | ✅ pass | dry-run |
| 9 | STT returns intent + sentiment | ✅ pass | complaint/negative |
| 10 | STT does not store transcript by default | ✅ pass | not stored |
| 11 | create voice queue draft | ✅ pass | vq_1781937202531_iznzo6 |
| 12 | queue draft requires approval + dry-run | ✅ pass | approval_pending + dryRun |
| 13 | voice cloning blocked without consent | ✅ pass | blocked |
| 14 | external provider denied by default | ✅ pass | live_provider_disabled |
| 15 | admin command !voicestatus works | ✅ pass | Voice AI status: Dry-run ON hai. 4 drafts pending hain. Live sending disabled ha |
| 16 | template render works | ✅ pass | Assalam o Alaikum Ali! SuperSender mein khush aamdeed. |
| 17 | no PII leak in combined previews | ✅ pass | clean |
| 18 | doctor runs | ✅ pass | checks=18 healthy=true |
