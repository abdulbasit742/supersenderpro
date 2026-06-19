'use strict';

/**
 * providers/amazon.js — Amazon Selling Partner API (SP-API) connector.
 * Auth: LWA (Login with Amazon) refresh token + client id/secret. The LWA
 * access token is exchanged at runtime and sent as x-amz-access-token.
 * (AWS SigV4 is no longer required for SP-API since 2023.)
 * Docs: https://developer-docs.amazon.com/sp-api/
 */

const ENDPOINTS = {
  na: 'https://sellingpartnerapi-na.amazon.com',
  eu: 'https://sellingpartnerapi-eu.amazon.com',
  fe: 'https://sellingpartnerapi-fe.amazon.com',
};
function endpoint(creds) { return ENDPOINTS[(creds.region || 'na').toLowerCase()] || ENDPOINTS.na; }

function validate(creds = {}) {
  if (!creds.refreshToken) return { ok: false, error: 'LWA refreshToken is required' };
  if (!creds.clientId || !creds.clientSecret) return { ok: false, error: 'clientId and clientSecret are required' };
  if (!creds.marketplaceId) return { ok: false, error: 'marketplaceId is required (e.g. ATVPDKIKX0DER for US)' };
  return { ok: true };
}

/** Exchange the LWA refresh token for a short-lived access token. */
async function lwaToken(creds, http) {
  const { status, data } = await http({
    method: 'POST',
    url: 'https://api.amazon.com/auth/o2/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: String(creds.refreshToken),
      client_id: String(creds.clientId),
      client_secret: String(creds.clientSecret),
    }).toString(),
  });
  if (status === 200 && data && data.access_token) return data.access_token;
  throw new Error(`LWA token exchange failed (HTTP ${status})`);
}

function normalizeOrder(o) {
  return {
    externalId: String(o.AmazonOrderId || ''),
    number: String(o.AmazonOrderId || ''),
    customerName: (o.BuyerInfo && o.BuyerInfo.BuyerName) || '',
    customerPhone: '',
    total: o.OrderTotal && o.OrderTotal.Amount != null ? Number(o.OrderTotal.Amount) : null,
    currency: (o.OrderTotal && o.OrderTotal.CurrencyCode) || null,
    status: o.OrderStatus || 'pending',
    items: [],
    createdAt: o.PurchaseDate || null,
  };
}

async function testConnection(creds, http) {
  try {
    const token = await lwaToken(creds, http);
    return { ok: !!token, info: { region: creds.region || 'na', marketplace: creds.marketplaceId } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function fetchProducts() {
  // SP-API catalog/listings requires per-seller listing items API + role approval;
  // returning [] keeps the unified interface stable until that scope is granted.
  return [];
}

async function fetchOrders(creds, http, opts = {}) {
  const token = await lwaToken(creds, http);
  const createdAfter = new Date(Date.now() - 30 * 864e5).toISOString();
  const { status, data } = await http({
    method: 'GET',
    url: `${endpoint(creds)}/orders/v0/orders`,
    headers: { 'x-amz-access-token': token },
    params: { MarketplaceIds: creds.marketplaceId, CreatedAfter: createdAfter, MaxResultsPerPage: opts.limit || 50 },
  });
  if (status !== 200) throw new Error(`Amazon orders HTTP ${status}`);
  const orders = (data && data.payload && data.payload.Orders) || [];
  return orders.map(normalizeOrder);
}

module.exports = {
  id: 'amazon', label: 'Amazon',
  credentialFields: [
    { key: 'refreshToken', label: 'LWA refresh token', secret: true },
    { key: 'clientId', label: 'LWA client id', secret: true },
    { key: 'clientSecret', label: 'LWA client secret', secret: true },
    { key: 'marketplaceId', label: 'Marketplace ID', placeholder: 'ATVPDKIKX0DER' },
    { key: 'region', label: 'Region (na/eu/fe)', placeholder: 'na' },
  ],
  validate, testConnection, fetchProducts, fetchOrders, normalizeOrder, lwaToken,
};
