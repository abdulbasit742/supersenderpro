function money(value = 0) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`;
}

function line() {
  return '━━━━━━━━━━━━━━━';
}

function accountTypeLabel(type = '') {
  const key = String(type || '').toLowerCase();
  if (key === 'private') return 'Private';
  if (key === 'warranty') return 'Warranty';
  if (key === 'non_warranty') return 'Non-Warranty';
  return key || 'Account';
}

function formatAvailability(rows = []) {
  if (!rows.length) return 'Stock abhi update nahi hua. Thori dair baad check karein.';
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.tool || row.toolSlug} ${row.plan || row.planSlug}`.trim();
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  const blocks = [];
  for (const [label, items] of groups) {
    const lines = [line(), `🤖 *${label}*`];
    for (const item of items) {
      const slotsValue = Number(item.slots ?? item.quantityAvailable ?? 0);
      const ok = slotsValue > 0 || item.inStock;
      const limited = item.limitedTime || item.isLimitedTime ? ' 🔥 LIMITED' : '';
      const slots = ok ? `(${slotsValue} slots)` : 'Out of stock 🔔';
      lines.push(`${ok ? '✅' : '❌'} ${accountTypeLabel(item.accountType)} — ${money(item.price)}${limited} ${slots}`);
    }
    blocks.push(lines.join('\n'));
  }
  return `${blocks.join('\n')}\n${line()}\n🔔 Out of stock item ke liye *YES* reply karein notify me save ho jayega.`;
}

function formatPriceReport(rows = []) {
  const out = ['📊 *Price Intelligence*', line()];
  for (const row of rows) {
    const low = row.lowest?.price || row.lowestPrice || 0;
    const avg = row.average || row.averagePrice || 0;
    const high = row.highest?.price || row.highestPrice || 0;
    const dealer = row.lowest?.dealerCode || row.bestDealerCode || 'Unverified';
    out.push(`🤖 ${row.tool || row.toolSlug} ${row.plan || row.planSlug}: Low ${money(low)} (${dealer}) | Avg ${money(avg)} | High ${money(high)}`);
  }
  out.push(line());
  return out.join('\n');
}

function formatStockSummary(rows = []) {
  if (!rows.length) return 'No stock rows found.';
  return [
    '*Stock Summary*',
    line(),
    ...rows.map((row) => `${row.toolSlug} ${row.planSlug} | ${accountTypeLabel(row.accountType)} | ${row.quantityAvailable}/${row.quantityTotal} | Dealer ${row.primaryDealerCode || '-'}`)
  ].join('\n');
}

module.exports = {
  money,
  line,
  accountTypeLabel,
  formatAvailability,
  formatPriceReport,
  formatStockSummary
};
