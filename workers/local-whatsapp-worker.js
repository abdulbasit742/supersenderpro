'use strict';
async function main() { console.log('Local WhatsApp worker placeholder. Use workers/local-whatsapp-worker.example.js for full dry-run loop.'); }
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { main };
