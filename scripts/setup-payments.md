# Payment Accounts Setup

## JazzCash Setup
1. Open JazzCash app
2. Go to Profile → My Account
3. Note your JazzCash number (03XX-XXXXXXX)
4. Add to .env:
```
JAZZCASH_NUMBER=0300-XXXXXXX
JAZZCASH_MERCHANT_NUMBER=0300-XXXXXXX
```

## EasyPaisa Setup
1. Open EasyPaisa app
2. Note your registered number (03XX-XXXXXXX)
3. Add to .env:
```
EASYPAISA_NUMBER=0321-XXXXXXX
EASYPAISA_MERCHANT_NUMBER=0321-XXXXXXX
```

## Bank Account Setup
1. Get your bank account number
2. Add to .env:
```
BANK_ACCOUNT=MCB-XXXXXXXXXX
BANK_NAME=MCB Bank
BANK_ACCOUNT_NUMBER=XXXXXXXXXX
```

## Payment Verification Rules
- Amount must match order ± Rs 5
- Transaction ID hashed (SHA-256) to prevent duplicates
- Payment must be within last 24 hours of order
- Optional: Enable sender number verification

## Test Payment Parser
```bash
curl -X POST http://localhost:3001/api/payments/parse-test \
  -H 'Content-Type: application/json' \
  -d '{"from":"alerts@jazzcash.pk","subject":"Payment Received","body":"Rs.1800 received TXN:123456"}'
```