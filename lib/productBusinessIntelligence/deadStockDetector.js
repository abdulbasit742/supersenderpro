 'use strict';
 function detect(products) {
   const days = Number(process.env.PRODUCT_BI_DEAD_DAYS || 90);
   return (products || [])
     .filter((p) => (Number(p.daysSinceLastSale) || 0) >= days && (Number(p.stockQty) || 0) > 0)
     .map((p) => ({ id: p.id, name: p.name, stockQty: p.stockQty, daysSinceLastSale: p.daysSinceLastSale,
 deadStockValuePreview: (Number(p.stockQty) || 0) * (Number(p.costPrice) || 0), signal: 'dead_stock' }));
 }
 module.exports = { detect };
