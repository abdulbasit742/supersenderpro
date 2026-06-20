# API Response Leak Detection

`lib/tenantIsolation/leakDetector.js` → `responseLeakDetector.js` → `payloadScanner.js` scan a payload for PII/secrets and return a **redacted** result.

Detected: full emails, phone numbers, IPs, payment refs, API keys, bearer tokens, private keys, secret-named fields, foreign tenant IDs.

```
detect(payload, ctx) -> { leakFound, leakCount, riskLevel, redactedPreview, findings, blockers, warnings }
```
Actual secret/PII values are **never** returned — only redacted previews and finding type/count.

Endpoints: `POST /api/tenant-isolation/leak-detect`, `POST /api/tenant-isolation/scan/payload`, `GET /api/tenant-isolation/leaks`.
