  # Group Commerce OS — QA Guide


  Read-only QA, smoke tests, and safety review for Group Commerce OS. Nothing here
  sends WhatsApp, removes members, posts to social/channels, writes ecommerce data,
  or calls external APIs. Reports write only to `artifacts/`.

  ## Run the checks

  ```bash
  # 1) Static + wiring + require scan (always safe)
  node scripts/group-commerce-check.js
  # or
  npm run group-commerce:check

  # 2) Smoke tests (HTTP probes are optional; skipped if server is down)
  node tests/smoke/groupCommerceSmoke.js
  # or
  npm run group-commerce:smoke



Outputs land in artifacts/ :

• group_commerce_check.json / .md
• group_commerce_smoke_results.json / .md
• group_commerce_qa_report.json / GROUP_COMMERCE_QA_REPORT.md
What dry-run means
With GROUP_COMMERCE_DRY_RUN=true (the default), every "live" action is
simulated and logged instead of executed. No WhatsApp message is sent, no group
member is removed, no order/product is written, no relay/social post happens. The
smoke tests assert these defaults stay on.

Live actions disabled by default
These env flags must stay false / true as shown for safe QA:


Flag                                         Safe default                      Meaning

 GROUP_COMMERCE_DRY_RUN                       true                             simulate everything

 GROUP_COMMERCE_AI_AUTO_REPLY                 false                            no auto AI replies into
                                                                               groups

 GROUP_COMMERCE_LIVE_GROUP_ACTIONS            false                            no real
                                                                               add/remove/pause on live
                                                                               groups

 GROUP_COMMERCE_LIVE_RELAY                    false                   no cross-group/channel
                                                                      relay

 GROUP_COMMERCE_ECOMMERCE_WRITE               false                   no order/product writes

 GROUP_COMMERCE_LINK_MODERATION_DRY_RUN       true                    flag spam links, don't
                                                                      delete


Verify dashboard / API manually
  node server.js          # start locally
  curl http://localhost:3001/api/group-commerce/status
  curl http://localhost:3001/api/group-commerce/groups
  # open http://localhost:3001/group-commerce.html



Status should return JSON without exposing full phone numbers, emails, or tokens.

What must NOT be committed
• Everything under artifacts/ (reports). Keep it gitignored.
• Any real .env (only .env.example with placeholders is committed).
• Any data file with real phone numbers / message bodies
  ( data/group-commerce.json , data/group-commerce-history.json ).

Known duplicate-risk areas
• A second group-commerce dashboard or route under src/modules/* while one
  already exists under routes/ + public/ .

• Group logic duplicated between lib/groupCommerce/* and any WhatsApp group
  handler in the existing inbox/flow modules.

• More than one app.use('/api/group-commerce', ...) mount in server.js .
  The check script flags all of these as duplicate_risk .

Safe next integration steps
1. Confirm group-commerce-check shows the route mounted exactly once.

2. Keep all live flags off until manual review of send/remove/relay paths.

3. Mask phone/email at the store layer before persisting.

4. Only enable GROUP_COMMERCE_ECOMMERCE_WRITE after the catalog bridge has its

  own tests.
