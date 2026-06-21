  # Gumloop Route Mount Map


  | Route file | API base | Mounted | Dashboard page | Script | Safe status route |
  | --- | --- | --- | --- | --- | --- |
  | routes/localExportRoutes.js | /api/local-export | verify | public/local-export.html | local-export:check | /api/local-
  export/status |
  | routes/localDemoRoutes.js | /api/local-demo | verify | public/local-demo.html | local-demo:check | /api/local-
  demo/status |
  | routes/mockGatewayRoutes.js | /api/mock-gateway | verify | public/mock-gateway.html | mock-gateway:check | /api/mock-
  gateway/status |
  | routes/guidedDemoRoutes.js | /api/guided-demo | verify | public/guided-demo.html | guided-demo:check | /api/guided-
  demo/status |
  | routes/localRuntimeRoutes.js | /api/local-runtime | verify | public/local-runtime.html | local-runtime:check |
  /api/local-runtime/status |
  | routes/gumloopHandoffRoutes.js | /api/gumloop-handoff | needs hook | public/gumloop-handoff.html | gumloop-
  handoff:check | /api/gumloop-handoff/status |


  No mounts modified except the single append-only GUMLOOP HANDOFF HOOK for the new route.
