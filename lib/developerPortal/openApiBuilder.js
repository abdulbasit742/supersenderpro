// developerPortal/openApiBuilder.js — builds a redacted OpenAPI-style JSON from the catalog.
const { ENDPOINTS } = require('./apiEndpointCatalog');
function build(){
  const paths={};
  for (const e of ENDPOINTS){
    paths[e.path] = paths[e.path] || {};
    paths[e.path][e.method.toLowerCase()] = {
      summary: e.summary, tags:[e.module],
      'x-scopes': e.scopes, 'x-dryRunSafe': e.dryRunSafe, 'x-piiRisk': e.piiRisk,
      security: e.authRequired ? [{ ApiKeyAuth: [] }] : [],
      responses: { '200': { description:'Redacted preview', content:{ 'application/json': { schema:{ type:'object', example: e.responseSchemaRedacted } } } } }
    };
  }
  return {
    openapi:'3.0.0',
    info:{ title:'SuperSender Pro Developer API (Preview)', version:'1.0.0-preview',
           description:'Redacted, preview-only API catalog. No secrets. No live destructive calls.' },
    servers:[{ url:'/api' }],
    components:{ securitySchemes:{ ApiKeyAuth:{ type:'apiKey', in:'header', name:'X-API-Key' } } },
    paths
  };
}
module.exports = { build };
