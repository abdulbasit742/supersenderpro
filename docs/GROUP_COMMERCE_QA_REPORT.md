# Group Commerce OS — QA Report


> Seed report generated from a workspace scan. Re-run `node scripts/group-commerce-check.js`
> locally to refresh against your actual repo state. The script overwrites the
> machine-readable `artifacts/group_commerce_qa_report.json`.

## Scan result (as of workspace review)

No Group Commerce OS files were found in the current repo. All core paths are
therefore classified **missing**. The QA tooling itself (this pack) is now present.

## Classification

| Item | Status | Notes |
| --- | --- | --- |
| `lib/groupCommerce/store.js` | missing | core storage not present |
| `lib/groupCommerce/groupRegistry.js` | missing | group registry not present |
| `lib/groupCommerce/commandRouter.js` | missing | command router not present |
| `lib/groupCommerce/moderation.js` | missing | moderation not present |
| `lib/groupCommerce/messageAnalyzer.js` | missing | analyzer not present |
| `lib/groupCommerce/catalog.js` | missing | catalog bridge not present |
| `lib/groupCommerce/ecommerceBridge.js` | missing | ecommerce bridge not present |
| `lib/groupCommerce/relayPlanner.js` | missing | relay planner not present |
| `lib/groupCommerce/agentRegistry.js` | missing | agent registry not present |
| `lib/groupCommerce/flowNodes.js` | missing | flow nodes not present |
| `lib/groupCommerce/pauseManager.js` | missing | pause manager not present |
| `routes/groupCommerceRoutes.js` | missing | needs_wiring once created |
| `public/group-commerce.html` | missing | dashboard page |
| `public/js/group-commerce.js` | missing | dashboard client |
| `public/css/group-commerce.css` | missing | dashboard styles |
| `docs/GROUP_COMMERCE_OS.md` | needs_docs | main feature doc not present |
| `docs/GROUP_COMMERCE_COMMANDS.md` | needs_docs | command reference not present |
| `docs/GROUP_COMMERCE_SAFETY.md` | needs_docs | safety doc not present |
| `docs/GROUP_COMMERCE_QA.md` | exists | created by this pack |
| `scripts/group-commerce-check.js` | exists | created by this pack |
| `tests/smoke/groupCommerceSmoke.js` | exists | created by this pack |
| `tests/smoke/groupCommerceFixtures.js` | exists | created by this pack |
| `/api/group-commerce` mount in `server.js` | needs_wiring | add hook once route exists |
| dashboard link in `public/index.html` | needs_wiring | add hook once page exists |
| `.env.example` GROUP_COMMERCE_* | needs_wiring | placeholders in PATCHES page |
| `package.json` scripts | needs_wiring | scripts in PATCHES page |

## Duplicate risk

None detected (nothing exists to duplicate). The check script will flag a
`duplicate_risk` if a second group-commerce route/page/module appears later.

## Safety issues

None found (no code to scan yet). Once the feature exists, the safety scan looks
for: direct WhatsApp sends, delete-message calls, remove-member calls,
social/channel posts, ecommerce writes, exposed tokens, full phone/email logging,
and raw message-body storage.

## Recommendation


Group Commerce OS does not exist yet. This is a **build** task, not a QA-an-existing-
feature task. Use this pack as the QA harness: build the feature, then re-run the
check + smoke scripts to turn the `missing` rows into `exists`.
