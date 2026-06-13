const prisma = require('./prisma');
const { createAlert } = require('./alertService');

async function adjustStock({ toolId, planId, plan, quantityDelta, costEach = 0, sourceDealerId = null }) {
  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool) throw new Error('tool not found');
  const existing = await prisma.stockItem.findUnique({ where: { toolId_plan: { toolId, plan } } });
  const nextQty = Math.max(0, Number(existing?.availableQty || 0) + Number(quantityDelta || 0));
  const nextAvgCost = costEach ? Number(costEach) : Number(existing?.avgCost || 0);
  const row = await prisma.stockItem.upsert({
    where: { toolId_plan: { toolId, plan } },
    update: {
      planId: planId || existing?.planId || null,
      availableQty: nextQty,
      avgCost: nextAvgCost,
      stockValue: nextQty * nextAvgCost,
      sourceDealerId: sourceDealerId || existing?.sourceDealerId || null
    },
    create: {
      toolId,
      planId: planId || null,
      plan,
      availableQty: nextQty,
      avgCost: nextAvgCost,
      stockValue: nextQty * nextAvgCost,
      sourceDealerId
    },
    include: { tool: true, planRef: true }
  });
  if (row.availableQty <= row.lowThreshold) {
    await createAlert({
      type: 'low_stock',
      title: `${row.tool.name} ${row.plan} low stock`,
      message: `Only ${row.availableQty} left. Reorder suggested.`,
      severity: row.availableQty === 0 ? 'danger' : 'warning',
      meta: { stockId: row.id }
    });
  }
  return row;
}

async function stockOverview() {
  const rows = await prisma.stockItem.findMany({ include: { tool: true, planRef: true }, orderBy: [{ availableQty: 'asc' }] });
  return rows.map(row => ({
    ...row,
    low: row.availableQty <= row.lowThreshold,
    out: row.availableQty <= 0
  }));
}

module.exports = { adjustStock, stockOverview };
