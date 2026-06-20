// developerPortal/adapters/supportHelpdeskAdapter.js — safe adapter for Support Helpdesk.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Support Helpdesk', detectFiles:['routes', 'server.js'], events:['support.ticket_created', 'support.ticket_resolved'] });
