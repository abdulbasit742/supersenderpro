# Seat Limits & Plans

Seat limits use the SaaS Billing adapter if available; otherwise these fallbacks (`lib/teamAccess/seatLimits.js`):

| Plan | Seats |
|---|---|
| Free Trial | 2 (1 owner + 1 viewer) |
| Starter | 2 |
| Growth | 5 |
| Pro | 10 |
| Agency | 25 |
| Reseller | 50 |
| Enterprise | custom |
| Lifetime | configured/custom |

## Seat usage preview
`GET /api/team-access/workspaces/:id/seats` returns:
`{ planId, seatLimit, activeSeats, availableSeats, exceeded, upgradeRecommendation, dryRun }`

No real billing changes are made. When a workspace exceeds its seat limit, an **upgrade preview** recommendation is returned — never a live billing mutation.
