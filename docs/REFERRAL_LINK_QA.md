# Referral Link QA

Referral QA reads the existing referralTracker link preview and asserts: code exists, code is safe ([a-zA-Z0-9_-], no
PII), link has no phone/email/token, link uses UTM/campaign params, and detects duplicate codes. The code validator is a
pure function reused by the readiness doctor.
