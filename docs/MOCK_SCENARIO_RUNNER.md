# Mock Scenario Runner

18 ready scenarios (WhatsApp order/payment/support, channel + social posts, ecommerce order, payment approved/rejected,
webhook success/fail, AI reply, voice transcript, support reply, dev API event, audit warning, tenant billing upgrade,
approval required, feature flag blocked).

## Running
`POST /api/mock-gateway/run { scenarioId }` or `POST /api/mock-gateway/run/:provider { input }`. Every run is logged to
the redacted event store.


## Data policy
Fake names, example.com emails, masked phones, DEMO-* refs (DEMO-ORDER-001, DEMO-PAY-001), example.com webhook URLs. No
real data, no secrets.
