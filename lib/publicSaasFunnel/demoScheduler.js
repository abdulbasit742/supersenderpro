// lib/publicSaasFunnel/demoScheduler.js
// Builds a DRY-RUN scheduling packet for a demo. Never creates a real calendar event by default.

const { config } = require('./store');

// Detect a Google Calendar integration without invoking it.
let calendarPresent = false;
try { require.resolve('../../integrations'); calendarPresent = true; } catch { calendarPresent = false; }

function buildPacket(demo, lead) {
  const packet = {
    type: 'demo_schedule_packet',
    demoId: demo.id,
    leadId: demo.leadId || null,
    businessType: demo.businessType || (lead && lead.businessType) || 'custom',
    preferredDate: demo.preferredDate || null,
    preferredTime: demo.preferredTime || null,
    timezone: demo.timezone || 'Asia/Karachi',
    requestedModules: demo.requestedModules || [],
    calendarIntegrationDetected: calendarPresent,
    realEventCreated: false,
    note: 'DRY-RUN packet only — no real calendar event created. Admin schedules manually.',
    createdAt: new Date().toISOString(),
  };
  return packet;
}

module.exports = { buildPacket, calendarPresent };
