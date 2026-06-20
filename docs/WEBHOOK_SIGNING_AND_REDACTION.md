# Webhook Signing & Redaction

- Each subscription gets a signing secret (`whsec_...`). Only a **masked preview** + SHA-256 hash are stored/exposed.
- Preview deliveries include a truncated `signaturePreview` (`sha256=...`).
- Receivers verify with: `HMAC_SHA256(secret, rawBody)` compared to the `X-SuperSender-Signature` header.
- **Redaction**: emails, phones, URLs, and any key matching `secret|token|key|password|auth|credential|session`
  are masked before any payload leaves the system.
