'use strict';
const b = require('./_base');
function kpi() {
    if (!b.anyExists(['lib/kpiCommand', 'routes/kpiCommandRoutes.js'])) return b.unavailable('KPI Command');
    return b.ok('KPI Command present');
}
module.exports = { kpi, health: kpi };
