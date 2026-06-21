  # Demo + Public Funnel Integration


  The Public SaaS Funnel does not exist yet, so the funnel CTA adapter
  (`lib/demoSandbox/adapters/publicFunnelAdapter.js`) returns `available:false`
  but ships the CTA definitions ready to drop in once the funnel is built:


  - "Try Demo" -> `/demo-sandbox.html`
  - "Open Guided Tour" -> `/demo-sandbox.html#tours`
  - "Start Sample Business Setup" -> `/business-setup.html`

  When the funnel exists, add these as tiny links on the public pages (do not
  rewrite full pages). No live actions are triggered by any CTA.


artifacts/demo_sandbox_inventory.json +
