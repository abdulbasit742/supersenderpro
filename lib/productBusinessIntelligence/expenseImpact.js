 'use strict';
 /**
  * expenseImpact.js — preview impact of expenses (delivery, payment fee, campaign)
  * on per-product profit. Rates via env; all preview-only.
  */
 function analyze(product, opts) {
   const o = opts || {};
   const sale = Number(product.salePrice) || 0;
   const sold = Number(product.soldQtyPreview) || 0;
   const revenue = sale * sold;
   const paymentFeeRate = Number(o.paymentFeeRate || process.env.PRODUCT_BI_PAYMENT_FEE_RATE || 0.02);
   const deliveryCostPerOrder = Number(o.deliveryCostPerOrder || process.env.PRODUCT_BI_DELIVERY_COST || 0);
   const campaignCost = Number(o.campaignCost || 0);
   const signals = [];
   const paymentFeeLoss = Math.round(revenue * paymentFeeRate);
   const deliveryLoss = Math.round(deliveryCostPerOrder * sold);
   if (paymentFeeLoss > 0) signals.push('payment_fee_loss');
   if (deliveryLoss > 0) signals.push('delivery_cost_loss');
   if (campaignCost > 0) signals.push('campaign_cost_impact');
   return { paymentFeeLoss, deliveryLoss, campaignCost, totalExpensePreview: paymentFeeLoss + deliveryLoss + campaignCost,
 signals };
 }
 module.exports = { analyze };
