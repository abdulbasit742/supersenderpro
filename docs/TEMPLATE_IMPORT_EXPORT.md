# Template Import / Export

## Export
`POST /api/template-marketplace/export {ids?}` returns a **redacted** JSON pack + Markdown summary.
Only safe template fields are exported — never secrets, never runtime customer/order/payment data.

## Import (preview only)
`POST /api/template-marketplace/import-preview {templates:[...]}`:
- validates each template's schema,
- detects duplicate template ids/slugs (against existing + within the pack),
- runs a leak scan,
- **does NOT activate** imported templates automatically.

Review duplicates and validation before manually upserting.
