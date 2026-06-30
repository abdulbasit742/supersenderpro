# Marketing Automation — Feature #4: Loyalty + Referral

Closes the retention loop. Contacts earn/redeem points, climb tiers, and refer friends — and all of
that becomes targetable by segments (#1), which drips (#2) and segment-broadcasts (#3) act on.

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/loyaltyEngine.js` | Points ledger, tiers, and referrals. Decorates contacts with loyalty attributes for segments. |
| `routes/marketingLoyaltyRoutes.js` | Earn/redeem, account + ledger view, referral code issue/redeem. |

## Points & tiers

- **earn / redeem** with a full ledger; balance never goes negative.
- **lifetime** points (total ever earned) drive the **tier** — redemptions don't demote you.
- Default tiers: `bronze 0` / `silver 500` / `gold 2000` / `vip 5000` (override with `setTiers`).

## Referrals

- Each contact can get a referral code (`getOrCreateReferralCode`).
- A **new** contact redeems it once → both sides rewarded (default referrer 200 / referee 100,
  override with `setReferralRewards`). Self-referral and double-redeem are blocked.

## API

```
GET  /api/marketing/loyalty/:id                 account (balance, lifetime, tier, referral)
GET  /api/marketing/loyalty/:id/ledger          recent points history
POST /api/marketing/loyalty/:id/earn            { points, reason? }
POST /api/marketing/loyalty/:id/redeem          { points, reason? }
POST /api/marketing/loyalty/:id/referral-code   issue/get this contact's code
POST /api/marketing/loyalty/:id/redeem-referral { code }   (new contact redeems)
```
(`:id` = phone or contact id.)

## The retention flywheel (how #1–#4 connect)

```
earn/redeem + referrals (#4)
        |  decorateContact -> loyaltyPoints, loyaltyTier, referredBy
        v
   segments (#1)   e.g. { loyaltyTier eq 'vip' }
        |
        +--> drip campaigns (#2)        "VIP welcome" / win-back sequences
        +--> segment broadcast (#3)     one-click blast to a tier
```

## Wiring (server.js)

```js
const loyalty = require('./lib/marketing/loyaltyEngine');
app.use('/api/marketing/loyalty', require('./routes/marketingLoyaltyRoutes'));

// Make loyalty attributes targetable by segments: decorate contacts in the CRM loader.
const loadCrmContacts = (storeId) => rawContacts(storeId).map(loyalty.decorateContact);
// now segments/drip/segment-broadcast can all target loyaltyTier / loyaltyPoints.

// (optional) auto-earn on purchase: call loyalty.earn(contact, Math.floor(orderTotal), 'order') in
// your order/payment-success handler.
```

## Roadmap position

- #1 Segments ✅
- #2 Drip campaigns ✅
- #3 Broadcast targeting by segment ✅
- **#4 Loyalty + referral ✅ (this)**
- #5 Campaign analytics (event log → open/click/conversion reporting)

## Follow-up

JSON-backed (`data/marketing_loyalty.json`). Move to Postgres in the SaaS migration; the ledger maps
cleanly to a `loyalty_ledger` table. For multi-instance, wrap earn/redeem in a short per-account lock.
