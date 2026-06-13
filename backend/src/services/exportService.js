const XLSX = require('xlsx');

function rowsToWorkbook(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

module.exports = { rowsToWorkbook };
