# Reseller Template Packs

If the Reseller Portal exists, `lib/templateMarketplace/adapters/resellerAssetAdapter.js` exposes
**reseller_safe** template packs and partner asset **draft previews** via
`GET /api/template-marketplace/reseller-packs`.

- Share mode is **draft_preview_only** — `liveSharing:false`.
- No live sharing/sending of assets.
- Returns `available:false` safely if the Reseller Portal module is not detected.
