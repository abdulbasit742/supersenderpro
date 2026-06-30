# Marketing Automation — Feature #4: Loyalty + Referrals

Make one-time buyers come back. Customers earn points, climb tiers automatically, and refer friends
for bonuses. Loyalty state (points + tier) is exposed to segments, so it loops back into drips (#2)
and segment broadcasts (#3) — e.g. a "gold tier" win-back drip.

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/loyaltyEngine.js` | Points ledger, auto-tiers, referral codes + attribution. |
| `routes/marketingLoyaltyRoutes.js` | Earn/redeem/account + referral register/convert API. |

## Points & tiers

- **Earn**: `earn(contact, amount, reason)` or `earnFromOrder(contact, orderTotal)` (uses
  `pointsPerCurrency`).
- **Redeem**: `redeem(contact, amount)` — fails if balance is too low.
- **Tiers** (by lifetime points, configurable): bronze 0 → silver 500 → gold 1500 → platinum 5000.
- Full **ledger** per account (every earn/redeem/referral entry).

## Referrals

1. `getOrCreateReferralCode(contact)` → a shareable code.
2. New customer signs up with it: `registerReferral(referee, code)` (pending).
3. On their first paid order: `convertReferral(referee)` awards the referrer + referee their bonuses
   once.

## Segment integration (the loop)

Use `enrichContact(contact)` in your CRM contact loader so every contact carries `loyaltyPoints`,
`loyaltyLifetime`, `loyaltyTier`. Then Feature #1 segments can target:

```json
{ "name": "Gold VIPs", "match": "all",
  "rules": [ { "field": "loyaltyTier", "op": "eq", "value": "gold" } ] }
```

…and that segment feeds a drip or a broadcast. Loyalty → segment → message, fully wired.

## API

```
GET  /api/marketing/loyalty/account/:id                 account
POST /api/marketing/loyalty/account/:id/earn            { amount, reason? }
POST /api/marketing/loyalty/account/:id/earn-order      { orderTotal, reason? }
POST /api/marketing/loyalty/account/:id/redeem          { amount, reason? }
GET  /api/marketing/loyalty/account/:id/referral-code   get/create code
POST /api/marketing/loyalty/referrals/register          { referee, code }
POST /api/marketing/loyalty/referrals/convert           { referee }
```

## Wiring (server.js)

```js
app.use('/api/marketing/loyalty', require('./routes/marketingLoyaltyRoutes'));

// award points automatically when an order is paid (hook into your order/payment flow):
const loyalty = require('./lib/marketing/loyaltyEngine');
onOrderPaid((order) => {
  loyalty.earnFromOrder({ phone: order.customerPhone }, order.total, `order ${order.id}`);
  loyalty.convertReferral({ phone: order.customerPhone }); // no-op if not referred
});

// expose loyalty to segments:
// in loadCrmContacts(), map contacts through loyalty.enrichContact(c)
```

## Roadmap position

- #1 Segments ✅
- #2 Drip campaigns ✅
- #3 Broadcast targeting by segment ✅
- **#4 Loyalty + referral wiring ✅ (this)**
- #5 Campaign analytics

## Follow-up

JSON-backed; move `data/marketing_loyalty.json` to Postgres in the SaaS migration. Consider point
expiry and a redemption catalogue (rewards) as later enhancements.
