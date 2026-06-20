// lib/securityGateway/rateLimitKeys.js — Build hashed rate-limit keys. Never includes raw IP.
const { hashIp, hashUserAgent, hashId } = require('./hashUtils');

function buildKey(ctx = {}) {
  const parts = [ctx.scope || 'generic'];
  if (ctx.routeGroup) parts.push(`rg:${ctx.routeGroup}`);
  if (ctx.formName) parts.push(`form:${ctx.formName}`);
  if (ctx.webhookSubscription) parts.push(`whs:${hashId('whs', ctx.webhookSubscription)}`);
  if (ctx.appId) parts.push(`app:${hashId('app', ctx.appId)}`);
  if (ctx.tenantId) parts.push(`tnt:${hashId('tnt', ctx.tenantId)}`);
  if (ctx.resellerId) parts.push(`rsl:${hashId('rsl', ctx.resellerId)}`);
  parts.push(`ip:${hashIp(ctx.ip)}`);
  if (ctx.userAgent) parts.push(`ua:${hashUserAgent(ctx.userAgent)}`);
  return parts.join('|');
}

module.exports = { buildKey };
