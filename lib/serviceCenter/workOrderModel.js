// lib/serviceCenter/workOrderModel.js
// Validation + normalization for work orders. Pure functions, no side effects.
'use strict';


const VALID_STATUS = ['open', 'diagnosed', 'assigned', 'in_progress', 'on_hold', 'awaiting_parts', 'completed', 'closed',
'cancelled'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'urgent'];

function validate(input) {
    const errors = [];
    if (!input || typeof input !== 'object') {
        return { ok: false, errors: ['payload must be an object'] };
    }
    if (!input.customerId && !input.customerName) errors.push('customerId or customerName required');
    if (!input.problem) errors.push('problem description required');
    if (input.priority && !VALID_PRIORITY.includes(input.priority)) {
      errors.push('invalid priority: ' + input.priority);
    }
    if (input.status && !VALID_STATUS.includes(input.status)) {
        errors.push('invalid status: ' + input.status);
    }
    return { ok: errors.length === 0, errors };
}

function normalize(input) {
    return {
      customerId: input.customerId || null,
        customerName: input.customerName || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        asset: input.asset || 'unspecified',
        problem: input.problem || '',
        priority: VALID_PRIORITY.includes(input.priority) ? input.priority : 'medium',
        zone: input.zone || 'unassigned',
        skillNeeded: input.skillNeeded || 'general',
        status: VALID_STATUS.includes(input.status) ? input.status : 'open',
        assignedTech: input.assignedTech || null
    };
}


function nextStatuses(current) {
  const flow = {
        open: ['diagnosed', 'assigned', 'cancelled'],
        diagnosed: ['assigned', 'awaiting_parts', 'cancelled'],
        assigned: ['in_progress', 'on_hold', 'cancelled'],
        in_progress: ['on_hold', 'awaiting_parts', 'completed'],
        on_hold: ['in_progress', 'cancelled'],
        awaiting_parts: ['in_progress', 'cancelled'],


    completed: ['closed'],
    closed: [],
    cancelled: []
   };
   return flow[current] || [];
}


module.exports = { VALID_STATUS, VALID_PRIORITY, validate, normalize, nextStatuses };
