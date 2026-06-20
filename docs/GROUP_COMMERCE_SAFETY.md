# Group Commerce OS Safety & Data Security Guidelines

Group Commerce OS is engineered from the ground up around two main design pillars: **Complete Dry-Run Protection** and **Zero-Trust Data Masking**.

---

## 1. Complete Dry-Run Boundaries

To prevent unauthorized automated responses, double message blasts, unwanted member kicks, or accidental updates to production databases, every external action in Group Commerce OS defaults to a **safe dry-run preview mode**.

### Safety Configurations (`.env.example` placeholders)
- `GROUP_COMMERCE_DRY_RUN=true`: When true, all system actions are simulated and logged. No actual writes are fired.
- `GROUP_COMMERCE_LINK_MODERATION_DRY_RUN=true`: When true, URLs are flagged in audit logs but messages are not deleted.
- `GROUP_COMMERCE_LIVE_GROUP_ACTIONS=false`: When false, admin moderation commands (like kicking or banning users) only generate draft reports.
- `GROUP_COMMERCE_LIVE_RELAY=false`: Disables direct automated posts to WhatsApp channels or social media pages, opting for visual drafts instead.
- `GROUP_COMMERCE_ECOMMERCE_WRITE=false`: Ensures WooCommerce or Shopify integrations only generate order/product drafts, avoiding duplicate billing.

---

## 2. Zero-Trust Data Masking Protocols

WhatsApp chat channels contain highly sensitive private data, including phone numbers, personal email addresses, billing addresses, and payment confirmation logs (e.g. Easypaisa receipts). 

Group Commerce OS implements strict masking protocols in `lib/groupCommerce/store.js` before saving *any* logs to disk:

### Masking Rules

#### A. Phone Numbers
- **Format Rule:** Keeps country code and prefix, masks middle digits, preserves last two identifiers.
- **Formula:** `+923001234567` ──► `+923*****67`
- **Helper function:** `maskPhoneNumber(phone)`

#### B. Emails
- **Format Rule:** Retains first letter of email, masks preceding characters, maintains domain structure.
- **Formula:** `john.doe@company.com` ──► `j***@company.com`
- **Helper function:** `maskEmail(email)`

#### C. General Content Shield
- **Format Rule:** Runs regex matching checks over raw message texts to capture credit cards, bank accounts, or Easypaisa transfers, redacting them cleanly before saving audit history.
- **Helper function:** `maskSensitiveInfo(text)`

---

## 3. Strict Local Paths

In compliance with local repo rules, all storage paths are relative to the active repository folder:
- **Registry storage:** `data/group-commerce.json`
- **Audit Logging storage:** `data/group-commerce-history.json`

No local paths like `C:`, `D:`, `/home/user`, or `/Users/` are permitted.
