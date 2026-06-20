# Abuse Protection

`lib/securityGateway/abuseDetector.js` combines stateless signal detectors (`abuseSignals.js`) with weighted scoring (`abuseScoring.js`).

## Detected signals
Repeated submissions, missing-consent repeats, webhook test spam, high failed-validation counts, API scope mismatch, admin route without guard, raw export attempts, live-action-disabled attempts, repeated token preview, tenant scope breach, secret-in-payload, PII-in-payload, suspicious/injection/traversal payloads, oversized payloads, support spam.

## Output
```
{ abuseScore, riskLevel, signals, recommendedAction, dryRun, blockers, warnings, actorSafe }
```
Risk levels: `low | medium | high | critical`.

## Endpoints
- `GET /api/security-gateway/abuse/signals`
- `POST /api/security-gateway/abuse/check`
- `POST /api/security-gateway/abuse/sample-run`

All detection is **report-only** by default and never exposes raw IP/PII/secrets.
