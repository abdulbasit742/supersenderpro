'use strict';
const SEVERITY = Object.freeze({ CRITICAL:'critical', HIGH:'high', MEDIUM:'medium', LOW:'low', INFO:'info' });
const SEVERITY_WEIGHT = Object.freeze({ critical:25, high:12, medium:5, low:2, info:0 });
const ENTITY = Object.freeze({ PRODUCT:'product', CUSTOMER:'customer', SUPPLIER:'supplier', FINANCE:'finance', INVENTORY:'inventory' });
function makeRule({ id, entity, severity, title, description, suggestion }) { return { id, entity, severity: SEVERITY[String(severity || 'LOW').toUpperCase()] || SEVERITY.LOW, title: title || id, description: description || '', suggestion: suggestion || '' }; }
const RULES = [
 makeRule({ id:'PROD_MISSING_NAME', entity:ENTITY.PRODUCT, severity:'HIGH', title:'Product missing name' }),
 makeRule({ id:'PROD_MISSING_PRICE', entity:ENTITY.PRODUCT, severity:'HIGH', title:'Product missing or zero price' }),
 makeRule({ id:'PROD_DUP_SKU', entity:ENTITY.PRODUCT, severity:'CRITICAL', title:'Duplicate SKU' }),
 makeRule({ id:'PROD_DUP_NAME', entity:ENTITY.PRODUCT, severity:'MEDIUM', title:'Near duplicate product name' }),
 makeRule({ id:'CUST_MISSING_CONTACT', entity:ENTITY.CUSTOMER, severity:'HIGH', title:'Customer has no phone or email' }),
 makeRule({ id:'CUST_BAD_EMAIL', entity:ENTITY.CUSTOMER, severity:'MEDIUM', title:'Malformed email' }),
 makeRule({ id:'CUST_BAD_PHONE', entity:ENTITY.CUSTOMER, severity:'MEDIUM', title:'Malformed phone' }),
 makeRule({ id:'CUST_DUP_CONTACT', entity:ENTITY.CUSTOMER, severity:'CRITICAL', title:'Duplicate customer contact' }),
 makeRule({ id:'SUPP_MISSING_CONTACT', entity:ENTITY.SUPPLIER, severity:'MEDIUM', title:'Supplier missing contact' }),
 makeRule({ id:'SUPP_DUP', entity:ENTITY.SUPPLIER, severity:'HIGH', title:'Duplicate supplier' }),
 makeRule({ id:'FIN_ORPHAN_INVOICE', entity:ENTITY.FINANCE, severity:'HIGH', title:'Invoice references unknown customer' }),
 makeRule({ id:'FIN_NEGATIVE_AMOUNT', entity:ENTITY.FINANCE, severity:'HIGH', title:'Negative or zero invoice amount' }),
 makeRule({ id:'FIN_DUP_INVOICE', entity:ENTITY.FINANCE, severity:'CRITICAL', title:'Duplicate invoice number' }),
 makeRule({ id:'INV_ORPHAN_STOCK', entity:ENTITY.INVENTORY, severity:'MEDIUM', title:'Stock row for unknown product' }),
 makeRule({ id:'INV_NEGATIVE_QTY', entity:ENTITY.INVENTORY, severity:'HIGH', title:'Negative stock quantity' }),
 makeRule({ id:'INV_PRODUCT_NO_STOCK', entity:ENTITY.INVENTORY, severity:'LOW', title:'Product has no stock record' })
];
const RULE_INDEX = RULES.reduce((acc, r) => { acc[r.id] = r; return acc; }, {});
function getRule(id) { return RULE_INDEX[id] || null; }
module.exports = { SEVERITY, SEVERITY_WEIGHT, ENTITY, makeRule, RULES, RULE_INDEX, getRule };
