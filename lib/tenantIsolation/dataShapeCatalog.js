// lib/tenantIsolation/dataShapeCatalog.js — Field categories for store/source scanning.
const TENANT_FIELDS = ['tenantId', 'workspaceId', 'resellerId', 'customerId', 'leadId', 'clientId'];
const PII_FIELDS = ['phone', 'email', 'paymentRef', 'transactionId'];
const SECRET_FIELDS = ['token', 'secret', 'apiKey', 'sessionId', 'webhookSecret', 'inviteToken'];
const RAW_FIELDS = ['rawMessage', 'transcript', 'orderData', 'notes'];
module.exports = { TENANT_FIELDS, PII_FIELDS, SECRET_FIELDS, RAW_FIELDS };
