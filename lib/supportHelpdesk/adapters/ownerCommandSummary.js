'use strict';
const tickets = require('../ticketRegistry');
function summary() { const list=tickets.list(); const commonIssues=Object.entries(list.reduce((a,t)=>{ a[t.category]=(a[t.category]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]).slice(0,5); return { ok:true, dryRun:true, totalTickets:list.length, open:list.filter((t)=>t.status!=='resolved' && t.status!=='archived').length, commonIssues }; }
module.exports = { summary };
