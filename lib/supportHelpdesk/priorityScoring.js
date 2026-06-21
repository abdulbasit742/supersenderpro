'use strict';
/** Derives priority from category + sentiment + source. */
function score(ticket) {
    let p = 'low';
    const cat = ticket.category, sent = ticket.sentiment;
    if (['billing','payment','whatsapp_connection','compliance'].includes(cat)) p = 'high';
    if (cat === 'bug') p = 'medium';
    if (sent === 'negative') p = p === 'high' ? 'critical' : 'high';
    if (ticket.pilotId && p === 'low') p = 'medium'; // pilot users get a floor
    return p;
}
module.exports = { score };
