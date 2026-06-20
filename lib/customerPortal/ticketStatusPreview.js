// lib/customerPortal/ticketStatusPreview.js — Safe helpdesk ticket + complaint previews. No ticket mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listTickets(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const warnings = [];
  const tickets = (customer.tickets || []).map((t) => {
    if (t.status === 'open') warnings.push('ticket_open');
    return {
      ticketIdPreview: maskRef(t.id, 'tkt'),
      statusPreview: `${t.status}_preview`,
      subjectSafe: safeText(t.subject),
      priority: t.priority || 'normal',
    };
  });
  return safeResponse({ liveTicketCreation: false, ticketsPreview: tickets, warnings });
}

function listComplaints(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const warnings = [];
  const complaints = (customer.complaints || []).map((c) => {
    if (c.status === 'unresolved') warnings.push('complaint_unresolved');
    return {
      complaintIdPreview: maskRef(c.id, 'cmp'),
      statusPreview: `${c.status}_preview`,
      subjectSafe: safeText(c.subject),
    };
  });
  return safeResponse({ complaintsPreview: complaints, warnings });
}

function getTicketStatusPreview(input = {}) {
  const list = listTickets(input);
  const first = (list.ticketsPreview || [])[0] || {};
  return safeResponse({ liveTicketCreation: false, ticketPreview: first, warnings: list.warnings });
}

module.exports = { listTickets, listComplaints, getTicketStatusPreview };
