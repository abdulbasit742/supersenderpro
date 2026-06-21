 'use strict';
 /**
  * productModel.js — core product shape, enums, factory, synthetic seeds.
     * Pure data + helpers; no I/O. No real data.
     */
 const crypto = require('crypto');

 const STOCK_STATUSES = ['in_stock', 'low_stock', 'out_of_stock', 'overstock', 'dead_stock'];
 const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];


 function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); }

 function newProduct(input) {
      const now = new Date().toISOString();
      const i = input || {};
      const costPrice = num(i.costPrice);
      const salePrice = num(i.salePrice);
      const stockQty = num(i.stockQty);
      const soldQtyPreview = num(i.soldQtyPreview);
      const returnedQtyPreview = num(i.returnedQtyPreview);
      const revenuePreview = salePrice * soldQtyPreview;
      const costPreview = costPrice * soldQtyPreview;
      const profitPreview = revenuePreview - costPreview;
      return {
        id: i.id || 'prd_' + crypto.randomBytes(5).toString('hex'),
        sku: i.sku || 'SKU-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        name: i.name || 'Unnamed product',
        category: i.category || 'general',
        supplierSafe: i.supplierSafe || 'Supplier',
        costPrice, salePrice, stockQty,
        reservedQty: num(i.reservedQty),
        soldQtyPreview, returnedQtyPreview,
        revenuePreview, costPreview, profitPreview,
        lossPreview: profitPreview < 0 ? Math.abs(profitPreview) : 0,
        marginPreview: salePrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0,
        stockStatus: i.stockStatus || 'in_stock',
        businessScore: num(i.businessScore),
        riskLevel: RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'low',
        daysSinceLastSale: num(i.daysSinceLastSale),
        dryRun: true,
        createdAt: i.createdAt || now,
        updatedAt: now,
      };
 }


 function seeds() {
   return [

    newProduct({ id: 'prd_seed1', sku: 'WA-PRO-1M', name: 'WhatsApp Pro 1 Month', category: 'subscription', supplier:
'CloudVendorA', costPrice: 200, salePrice: 550, stockQty: 9999, soldQtyPreview: 320, returnedQtyPreview: 4,
daysSinceLastSale: 0 }),
  newProduct({ id: 'prd_seed2', sku: 'AI-TOOL-YR', name: 'AI Tool Yearly', category: 'subscription', supplier:
'CloudVendorB', costPrice: 4000, salePrice: 4200, stockQty: 9999, soldQtyPreview: 18, returnedQtyPreview: 3,
daysSinceLastSale: 12 }),
  newProduct({ id: 'prd_seed3', sku: 'HW-DONGLE', name: 'USB Dongle', category: 'hardware', supplier: 'HardwareCoX',
costPrice: 1500, salePrice: 1400, stockQty: 60, soldQtyPreview: 2, returnedQtyPreview: 0, daysSinceLastSale: 95 }),
  newProduct({ id: 'prd_seed4', sku: 'ACC-CABLE', name: 'Charging Cable', category: 'accessory', supplier:
'HardwareCoX', costPrice: 100, salePrice: 350, stockQty: 4, soldQtyPreview: 140, returnedQtyPreview: 1,
daysSinceLastSale: 1 }),
  newProduct({ id: 'prd_seed5', sku: 'BUNDLE-X', name: 'Starter Bundle', category: 'bundle', supplier: 'CloudVendorA',
costPrice: 0, salePrice: 1200, stockQty: 0, soldQtyPreview: 0, returnedQtyPreview: 0, daysSinceLastSale: 200 }),
  ];
}


module.exports = { STOCK_STATUSES, RISK_LEVELS, newProduct, seeds, num };
