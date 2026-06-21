# Reseller Privacy Isolation


Tenant privacy QA asserts a reseller only sees assigned client previews, with no raw customer phone/email, payment refs,
secrets, raw chats/messages/orders, or other tenant data. It runs a cross-reseller probe (another reseller id must not
see this reseller's clients) and confirms the default reseller returns redacted demo data only. Client preview QA
confirms previews are business-name level (allowlisted keys only).

Any leak is reported as a blocker.
