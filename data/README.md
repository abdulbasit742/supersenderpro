# Runtime Data

This folder is created and updated by SuperSender Pro at runtime.

Real JSON/CSV/Markdown data files are intentionally ignored by Git because they can contain:

- WhatsApp sessions or channel state
- Customer phone numbers and order history
- API tokens and OAuth states
- Dealer rates, logs, analytics, and private business records

Use `settings.example.json` as a safe template for local setup. The app will create missing runtime files automatically.
