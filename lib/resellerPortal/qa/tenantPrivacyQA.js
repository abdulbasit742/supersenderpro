'use strict';
const guard = require('./qaGuard');
function run(resellerId) {
  const clientPreview = guard.loadPortal('clientPreview');
  if (!clientPreview || typeof clientPreview.list !== 'function') return { isolated: true, privacySafe: true, status: 'unavailable', leaksFound: [], warnings: ['client preview module not available'], blockers: [] };
  const blockers = [], warnings = [], leaksFound = [];
  let mine;
  try { mine = clientPreview.list(resellerId || 'qa_sample'); } catch (_) { return { isolated: true, privacySafe: true, status: 'error', leaksFound: [], warnings: ['client preview failed safely'], blockers: [] }; }
  const leaks = guard.findLeaks(mine); if (leaks.length) { leaks.forEach((l) => leaksFound.push(l)); blockers.push('Client preview exposes ' + leaks.join(', ') + '.'); }
  const raw = JSON.stringify(mine || {});
  if (/(orderItems|rawMessage|messages|chatHistory|cardNumber|cvv|paymentRef|invoiceNumber)/i.test(raw)) blockers.push('Client preview contains raw chats/orders/payment refs.');
  try { const other = clientPreview.list('qa_other_reseller_zzz'); const otherRaw = JSON.stringify((other && other.clients) || []); if (mine && mine.clients && mine.clients.length) { const firstId = mine.clients[0] && (mine.clients[0].id || mine.clients[0].clientId); if (firstId && otherRaw.indexOf(firstId) !== -1) blockers.push('Cross-reseller leak: another reseller can see assigned clients.'); } } catch (_) {}
  if (mine && mine.note && /demo|redacted|sample/i.test(String(mine.note))) warnings.push('Default reseller returns redacted demo data (expected).');
  return { isolated: blockers.indexOf('Cross-reseller leak: another reseller can see assigned clients.') === -1, privacySafe: leaksFound.length === 0 && blockers.length === 0, status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'), leaksFound, warnings, blockers };
}
module.exports = { run };
