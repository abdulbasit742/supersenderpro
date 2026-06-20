// developerPortal/apiCatalog.js — facade combining endpoint catalog + OpenAPI + docs metadata.
const { ENDPOINTS, list, modules } = require('./apiEndpointCatalog');
const openApi = require('./openApiBuilder');
function catalog(module){ return { modules: modules(), endpoints: list(module), total: ENDPOINTS.length }; }
function openapi(){ return openApi.build(); }
module.exports = { catalog, openapi };
