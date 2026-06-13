const sheetsSync = require('../utils/sheetsSync');

async function syncDailyToSheets() {
  return sheetsSync.syncAll();
}

module.exports = {
  ...sheetsSync,
  syncDailyToSheets
};
