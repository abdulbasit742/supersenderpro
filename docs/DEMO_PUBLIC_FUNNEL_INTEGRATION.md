# Demo ↔ Public Funnel Integration

The Public SaaS Funnel is **not rebuilt**. Integration is additive only.

## Safe adapter
`lib/demoSandbox/adapters/publicFunnelAdapter.js` exposes CTA metadata:
- **Try Demo** → `/demo-sandbox.html`
- **Open Guided Tour** → `/demo-sandbox.html#tours`
- **Start Sample Business Setup** → `/demo-sandbox.html#scenarios`

## Allowed hook (tiny, append-only)
If you add a CTA to a public page, use only this marked, removable hook — do **not** rewrite the page:
```html
<!-- BEGIN DEMO SANDBOX HOOK -->
<a href="/demo-sandbox.html" class="demo-cta">Try Demo</a>
<!-- END DEMO SANDBOX HOOK -->
```

## Server / dashboard hooks
Server route mount and the dashboard nav link also use the same marked block format
(`BEGIN/END DEMO SANDBOX HOOK`) so they are easy to review and revert.
