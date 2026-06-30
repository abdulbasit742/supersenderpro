'use strict';
/**
 * routes/docsRoutes.js - serve the OpenAPI spec + a Swagger UI page. Mounted at /api/docs (bootstrap).
 * Swagger UI is loaded from a CDN so we add no dependency / build step.
 */
const express = require('express');
const { build } = require('../lib/apiDocs/openapi');

const router = express.Router();

router.get('/openapi.json', (req, res) => { res.json(build()); });

router.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>SuperSender API Docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head><body><div id="swagger"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>window.onload=function(){window.ui=SwaggerUIBundle({url:'openapi.json',dom_id:'#swagger'});};</script>
</body></html>`);
});

module.exports = router;
