  'use strict';
  /**
      * productionOrderModel.js — production order shape, enums, factory, seeds.
      * Pure data; no I/O. All money/qty fields are *Preview.

   */
const crypto = require('crypto');

const PRODUCTION_STATUSES = ['draft', 'material_check_preview', 'ready_preview', 'shortage_preview',
'in_progress_preview', 'completed_preview', 'cancelled_preview', 'blocked_preview'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const RISK_SIGNALS = ['raw_material_shortage', 'component_missing', 'cost_above_sale_price', 'margin_too_low',
'wastage_high', 'labor_cost_high', 'overhead_high', 'supplier_delay_risk', 'production_location_missing',
'batch_tracking_missing', 'expiry_risk', 'approval_required', 'accounting_mapping_missing'];


function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); }


function newOrder(input) {
    const now = new Date().toISOString();
    const i = input || {};
    return {
      id: i.id || 'po_' + crypto.randomBytes(5).toString('hex'),
        productionNumber: i.productionNumber || 'PRD-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        bomId: i.bomId || null,
        finishedProductId: i.finishedProductId || null,
        quantityToProduce: num(i.quantityToProduce, 1),
        productionLocationId: i.productionLocationId || null,
        status: PRODUCTION_STATUSES.includes(i.status) ? i.status : 'draft',
        materialCostPreview: num(i.materialCostPreview),
        laborCostPreview: num(i.laborCostPreview),
        overheadCostPreview: num(i.overheadCostPreview),
        wastageCostPreview: num(i.wastageCostPreview),
        totalProductionCostPreview: num(i.totalProductionCostPreview),
        finishedGoodsValuePreview: num(i.finishedGoodsValuePreview),
        riskLevel: RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'low',
        dryRun: true,
        createdAt: i.createdAt || now,
        updatedAt: now,
    };
}


function seeds() {
    return [
      newOrder({ id: 'po_seed1', bomId: 'bom_kit1', quantityToProduce: 10, productionLocationId: 'wh_main', status:
'material_check_preview' }),
   newOrder({ id: 'po_seed2', bomId: 'bom_kit2', quantityToProduce: 50, productionLocationId: null, status: 'draft' }),
    ];
}


module.exports = { PRODUCTION_STATUSES, RISK_LEVELS, RISK_SIGNALS, newOrder, seeds, num };
