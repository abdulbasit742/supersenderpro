# Pilot Success & Risk Scoring

## Success score (0-100)
Weighted: checklist completion 25, demo 10, trial active 10, key modules 15, first workflow tested 10, owner briefing 5,
follow-up drafted 5, automation draft 5, no critical incidents 10, positive feedback 5.


## Risk score (0-100; higher = more churn risk)
Weighted: setup stuck 15, missing WhatsApp 15, missing payment 10, no activity 10, incidents unresolved 10, complaint 10,
trial expiring 10, billing not configured 5, compliance blocker 8, unresponsive 7. Level: high >=60, medium >=30, else
low.


## Signals
Pass a `signals` object to `/scores/run` and `/conversion-preview` (e.g. demoCompleted, whatsappConnected,
paymentConfigured, recentActivity, criticalIncidents, customerComplaint).
