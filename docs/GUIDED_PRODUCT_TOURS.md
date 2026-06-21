# Guided Product Tours

Lightweight overlay (`public/js/demo-tour.js`) that highlights a page element if
the selector exists, else shows a fallback card. Supports start / next / previous
/ skip / finish / progress, and resumes across page navigation.


## Tours
Full Product, Business Owner, WhatsApp Automation, Channel Automation, Customer
360, Voice AI, Growth Campaign, SaaS Billing, KPI Command, Public Funnel.

## Start a tour
From the demo dashboard, click "Start tour", or call `window.startDemoTour(id)`.
Progress is tracked via `/api/demo-sandbox/tours/:id/step`.
