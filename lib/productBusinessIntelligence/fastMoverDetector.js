 'use strict';
 function detect(products) {
   const threshold = Number(process.env.PRODUCT_BI_FAST_MOVER_SOLD || 100);
   return (products || [])
     .filter((p) => (Number(p.soldQtyPreview) || 0) >= threshold)
     .map((p) => ({ id: p.id, name: p.name, soldQtyPreview: p.soldQtyPreview, revenuePreview: (Number(p.salePrice) || 0) *
 (Number(p.soldQtyPreview) || 0), signal: 'fast_moving', restockWatch: (Number(p.stockQty) || 0) <=
 Number(process.env.PRODUCT_BI_LOW_STOCK || 10) }));
 }
 module.exports = { detect };
