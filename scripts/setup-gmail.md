# Gmail Setup for Payment Parser

## Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification

## Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select 'Mail' and 'Windows Computer'
3. Click Generate
4. Copy the 16-character password (e.g. xxxx xxxx xxxx xxxx)

## Step 3: Add to .env
```
EMAIL_USER=yourstore@gmail.com
EMAIL_PASSWORD=xxxxxxxxxxxx   # (no spaces in the app password)
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_PAYMENT_PARSER_ENABLED=true
```

## Step 4: Enable IMAP
1. Open Gmail → Settings (gear icon) → See all settings
2. Forwarding and POP/IMAP tab
3. Enable IMAP Access → Save Changes

## Step 5: Test
```bash
node scripts/full-setup.js
```

## Payment Email Formats Supported
- **JazzCash**: From jazz alerts, contains 'Rs.' and transaction ID
- **EasyPaisa**: From Telenor Easypaisa alerts
- **Bank Transfer**: MCB/HBL/UBL/Meezan bank credit alerts

## Security Note
- Never share your App Password
- Revoke it at: https://myaccount.google.com/apppasswords