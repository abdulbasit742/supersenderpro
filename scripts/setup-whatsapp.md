# WhatsApp Sessions Setup

## Step 1: Start the Server
```bash
node server.js
# Wait for 'server running on port 3001'
```

## Step 2: Scan QR Codes (3 sessions)
Open these URLs in browser and scan with WhatsApp:

### Customer Bot (main sales bot)
http://localhost:3001/api/whatsapp/qr/customer-bot
- Use your main sales WhatsApp number

### Dealer Monitor
http://localhost:3001/api/whatsapp/qr/dealer-monitor
- Use a second number to monitor dealer groups

### Admin Alerts
http://localhost:3001/api/whatsapp/qr/admin-alerts
- Use a number for internal admin notifications

## Step 3: Add Group IDs
```bash
# In dealer/customer group, send any message via bot
# Bot will log the group ID
# Or use: !addgroup GROUP_ID CUSTOMER groupname
```

## Add to .env:
```
SELLING_GROUPS=120363XXXXXXXXXX@g.us,120363YYYYYYYYYY@g.us
CUSTOMER_GROUPS=120363XXXXXXXXXX@g.us
ADMIN_NUMBER=923001234567
```

## Reconnect Automatically
Sessions saved in .baileys-auth/ folder.
Set WA_AUTO_CONNECT=true for auto-reconnect.