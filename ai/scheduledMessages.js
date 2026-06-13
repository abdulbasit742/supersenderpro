// Scheduled Messages Module - Send messages at specific times or recurring schedules

const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

class ScheduledMessages {
  constructor(dataDir, sendDirect) {
    this.dataDir = dataDir;
    this.sendDirect = sendDirect;
    this.scheduledFile = path.join(dataDir, 'scheduled_messages.json');
    this.scheduledJobs = new Map();
    this.init();
    this.loadAndSchedule();
  }

  init() {
    if (!fs.existsSync(this.scheduledFile)) {
      fs.writeFileSync(this.scheduledFile, JSON.stringify([], null, 2));
    }
  }

  loadScheduled() {
    try {
      const data = require(this.scheduledFile);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  saveScheduled(scheduled) {
    fs.writeFileSync(this.scheduledFile, JSON.stringify(scheduled, null, 2));
  }

  /**
   * Schedule a new message
   * @param {Object} data - { id, number, message, scheduleType: 'once'|'recurring', cronExpression, sendAt, isActive }
   */
  schedule(data) {
    const scheduled = this.loadScheduled();
    const record = {
      id: data.id || uuid(),
      number: data.number,
      message: data.message,
      scheduleType: data.scheduleType || 'once',
      cronExpression: data.cronExpression || null,
      sendAt: data.sendAt || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      lastSent: null,
      nextSend: data.sendAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    scheduled.push(record);
    this.saveScheduled(scheduled);
    if (record.isActive) {
      this.scheduleJob(record);
    }
    return record;
  }

  update(id, updates) {
    const scheduled = this.loadScheduled();
    const idx = scheduled.findIndex(s => s.id === id);
    if (idx === -1) return null;
    scheduled[idx] = { ...scheduled[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveScheduled(scheduled);
    this.unscheduleJob(id);
    if (scheduled[idx].isActive) {
      this.scheduleJob(scheduled[idx]);
    }
    return scheduled[idx];
  }

  delete(id) {
    const scheduled = this.loadScheduled();
    const filtered = scheduled.filter(s => s.id !== id);
    this.saveScheduled(filtered);
    this.unscheduleJob(id);
    return true;
  }

  /**
   * Schedule a cron job for a scheduled message
   */
  scheduleJob(record) {
    this.unscheduleJob(record.id);
    let cronExpr;
    if (record.scheduleType === 'recurring' && record.cronExpression) {
      cronExpr = record.cronExpression;
    } else if (record.scheduleType === 'once' && record.sendAt) {
      const d = new Date(record.sendAt);
      cronExpr = `${d.getMinutes()} ${d.getHours()} ${d.getDate()} ${d.getMonth()+1} *`;
    } else {
      return;
    }
    const job = cron.schedule(cronExpr, async () => {
      await this.sendMessage(record);
      if (record.scheduleType === 'once') {
        this.delete(record.id);
      }
    });
    this.scheduledJobs.set(record.id, job);
  }

  unscheduleJob(id) {
    if (this.scheduledJobs.has(id)) {
      const job = this.scheduledJobs.get(id);
      job.stop();
      this.scheduledJobs.delete(id);
    }
  }

  async sendMessage(record) {
    try {
      await this.sendDirect(record.number, record.message);
      const scheduled = this.loadScheduled();
      const s = scheduled.find(s => s.id === record.id);
      if (s) {
        s.lastSent = new Date().toISOString();
        this.saveScheduled(scheduled);
      }
      console.log(`Scheduled message sent to ${record.number}`);
    } catch (err) {
      console.error(`Failed to send scheduled message ${record.id}:`, err.message);
    }
  }

  loadAndSchedule() {
    const scheduled = this.loadScheduled();
    scheduled.filter(s => s.isActive).forEach(s => this.scheduleJob(s));
  }

  getAll() {
    return this.loadScheduled();
  }
}

module.exports = ScheduledMessages;