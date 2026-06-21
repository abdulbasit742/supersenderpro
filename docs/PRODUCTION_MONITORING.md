 # Production Monitoring

 How health is computed. Each module has a read-only adapter exposing `health()`. The aggregator runs them all, normalizes
 results, persists a snapshot, and scores 0-100 (penalty-weighted by worst status). Adapters check file/env presence and

read existing reports (launch, security) but never call external APIs and never expose secrets.

## Score model
healthy 0, unknown/unavailable 1, warning 4, degraded 9, failing 16, blocked 25 penalty per module; score = 100 -
(sum/maxPenalty)*100.

## Wiring deeper signals later
Adapters currently use safe presence/report checks. To deepen, point an adapter at an existing module's status function
(read-only) and return a richer record, no new health engine needed.
