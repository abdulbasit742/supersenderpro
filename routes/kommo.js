const express = require('express');

module.exports = function(kommoCRM) {
  const router = express.Router();

  // 1. Get entire pipelines configuration
  router.get('/kommo/pipelines', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const pipelines = kommoCRM.getPipelines(storeId);
      res.json({ success: true, pipelines });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Get specific lead card
  router.get('/kommo/leads/:phone', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const phone = req.params.phone;
      const leadCard = kommoCRM.getLeadCard(storeId, phone);
      if (!leadCard) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
      res.json({ success: true, leadCard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Move lead to stage (triggers Salesbot)
  router.post('/kommo/leads/move', async (req, res) => {
    try {
      const { storeId = 'default_store', phone, stageId, changedBy, reason } = req.body;
      if (!phone || !stageId) {
        return res.status(400).json({ success: false, error: 'phone and stageId are required' });
      }
      const updatedCustomer = await kommoCRM.moveLeadToStage(storeId, phone, stageId, changedBy, reason);
      res.json({ success: true, customer: updatedCustomer });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Update lead custom fields
  router.post('/kommo/leads/custom-fields', (req, res) => {
    try {
      const { storeId = 'default_store', phone, customFields } = req.body;
      if (!phone || !customFields) {
        return res.status(400).json({ success: false, error: 'phone and customFields are required' });
      }
      const updated = kommoCRM.updateLeadCustomFields(storeId, phone, customFields);
      res.json({ success: true, customer: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Update lead assigned agent
  router.post('/kommo/leads/assign', (req, res) => {
    try {
      const { storeId = 'default_store', phone, agentName } = req.body;
      if (!phone || !agentName) {
        return res.status(400).json({ success: false, error: 'phone and agentName are required' });
      }
      const updated = kommoCRM.updateLeadAgent(storeId, phone, agentName);
      res.json({ success: true, customer: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Get list of agents
  router.get('/kommo/agents', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const agents = kommoCRM.getAgents(storeId);
      res.json({ success: true, agents });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Register agent
  router.post('/kommo/agents', (req, res) => {
    try {
      const { storeId = 'default_store', username, details } = req.body;
      if (!username) {
        return res.status(400).json({ success: false, error: 'username is required' });
      }
      const agent = kommoCRM.registerAgent(storeId, username, details);
      res.json({ success: true, agent });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Set agent online status
  router.post('/kommo/agents/status', (req, res) => {
    try {
      const { storeId = 'default_store', username, isOnline } = req.body;
      if (!username || isOnline === undefined) {
        return res.status(400).json({ success: false, error: 'username and isOnline are required' });
      }
      const agent = kommoCRM.setAgentStatus(storeId, username, isOnline);
      res.json({ success: true, agent });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Auto-route lead (round-robin)
  router.post('/kommo/leads/route', (req, res) => {
    try {
      const { storeId = 'default_store', phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'phone is required' });
      }
      const assignedAgent = kommoCRM.autoRouteLead(storeId, phone);
      res.json({ success: true, assignedAgent });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Get triggers config
  router.get('/kommo/triggers', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const triggers = kommoCRM.getStageTriggers(storeId);
      res.json({ success: true, triggers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Update trigger
  router.post('/kommo/triggers', (req, res) => {
    try {
      const { storeId = 'default_store', stageId, triggerIndex, updates } = req.body;
      if (!stageId || triggerIndex === undefined || !updates) {
        return res.status(400).json({ success: false, error: 'stageId, triggerIndex, and updates are required' });
      }
      const stageTriggers = kommoCRM.setStageTrigger(storeId, stageId, triggerIndex, updates);
      res.json({ success: true, triggers: stageTriggers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
