 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('ticket', { attention: ['open', 'awaiting_customer'], detail: () => ({
 liveTicketCreation: false, note: 'Ticket status preview only; no ticket mutation.' }) }) };
