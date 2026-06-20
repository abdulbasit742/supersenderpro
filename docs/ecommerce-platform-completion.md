# Ecommerce Platform Completion

SuperSender Pro now has a universal ecommerce control layer exposed in the main dashboard Commerce section and in the full `/ecommerce-hub` page.

## Live UI

- Main dashboard: `/` -> Commerce
- Full hub: `/ecommerce-hub`
- Status JSON: `/api/ecommerce/status`
- Platform list: `/api/ecommerce/platforms`
- Feature matrix: `/api/ecommerce/features`

## Connected Platform Coverage

The backend platform directory currently supports:

- Shopify
- WooCommerce
- Magento / Adobe Commerce
- BigCommerce
- Ecwid
- OpenCart
- Wix Stores
- Squarespace Commerce
- Daraz Seller Center
- Dukaan
- Amazon Seller / SP-API through bridge/feed
- eBay through bridge/feed
- Etsy through bridge/feed
- Lazada through bridge/feed
- AliExpress / Dropshipping feed
- SHOPLINE
- Shopware
- commercetools through bridge/feed
- Square Online
- Lightspeed
- Odoo Ecommerce
- Zoho Commerce
- WhatsApp Catalog / Manual Store
- Custom Website / API

## Connection Modes

1. Direct API connection:
   - Store URL
   - Access token or API token
   - Optional store hash / store ID
   - Optional consumer key + secret for WooCommerce

2. Feed bridge:
   - Products Feed URL
   - Orders Feed URL
   - Optional bearer token

3. Webhook ingestion:
   - POST orders to `/api/ecommerce/webhook/:platform`
   - POST orders for a saved connection to `/api/ecommerce/webhook/:platform/:connectionId`

## Dashboard Controls Added

The main Commerce UI now includes:

- Platform selector for all supported platforms
- Connection form for store URL, feeds, token, key, secret, store hash/store ID
- Auto product sync toggle
- Auto order sync toggle
- Copy webhook button
- Save connection button
- Test selected connection button
- Sync all button
- Live connection table with Test, Products, Orders, Delete actions
- Feature matrix showing product sync, order sync, and bridge mode

## Important Notes

- Sensitive tokens are stored in local runtime JSON and are not pushed to Git.
- Public repo only includes source code, docs, and placeholders.
- For marketplaces that require signed OAuth/API flows, use n8n or a custom JSON feed bridge and send normalized payloads to SuperSender.
- WhatsApp notifications use the existing `sendCommerceMessage` flow and respect Commerce settings.
