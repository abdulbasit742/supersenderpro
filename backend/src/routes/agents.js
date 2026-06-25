const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');
const { listAgents, getAgent, AGENT_REGISTRY } = require('../agents/agents');
const { listTools, executeTool } = require('../agents/tools');
const { AgentPlanner } = require('../agents/planner');
const { getMemory } = require('../agents/memory');

const MISSIONS_FILE = path.join(__dirname, '../../../data/agent_missions.json');
const EXEC_LOG_FILE = path.join(__dirname, '../../../data/agent_executions.json');
function loadMissions() { try { return JSON.parse(fs.readFileSync(MISSIONS_FILE, 'utf8')); } catch(e) { return []; } }
function saveMissions(d) { fs.writeFileSync(MISSIONS_FILE, JSON.stringify(d.slice(0, 500), null, 2)); }
function loadExecLog() { try { return JSON.parse(fs.readFileSync(EXEC_LOG_FILE, 'utf8')); } catch(e) { return []; } }
function saveExecLog(d) { fs.writeFileSync(EXEC_LOG_FILE, JSON.stringify(d.slice(0, 1000), null, 2)); }

// GET /api/agents — list all agents
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ agents: listAgents(), total: listAgents().length });
}));

// GET /api/agents/stats
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const agents = listAgents();
  const missions = loadMissions();
  const execLog = loadExecLog();
  const tools = listTools();
  const missionsByStatus = {};
  missions.forEach(function(m) { missionsByStatus[m.status] = (missionsByStatus[m.status]||0)+1; });
  const agentsByStatus = {};
  agents.forEach(function(a) { agentsByStatus[a.status] = (agentsByStatus[a.status]||0)+1; });
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    agents: { total: agents.length, byStatus: agentsByStatus },
    missions: { total: missions.length, byStatus: missionsByStatus },
    executions: { total: execLog.length, today: execLog.filter(function(e) { return e.executedAt.startsWith(today); }).length },
    tools: { total: tools.length, categories: [...new Set(tools.map(function(t) { return t.category; }))] }
  });
}));

// GET /api/agents/tools — list available tools
router.get('/tools', requireAuth, asyncHandler(async (req, res) => {
  const tools = listTools(req.query.category);
  const categories = [...new Set(tools.map(function(t) { return t.category; }))];
  res.json({ tools: tools.map(function(t) { return { name: t.name, description: t.description, schema: t.schema, category: t.category, requiresApproval: t.requiresApproval }; }), total: tools.length, categories: categories });
}));

// POST /api/agents/tools/execute — execute a tool directly
router.post('/tools/execute', requireAuth, asyncHandler(async (req, res) => {
  const { tool, params } = req.body || {};
  if (!tool) return res.status(400).json({ error: 'tool name required' });
  const result = await executeTool(tool, params || {});
  res.json(result);
}));

// GET /api/agents/missions — list missions
router.get('/missions', requireAuth, asyncHandler(async (req, res) => {
  const missions = loadMissions();
  const filter = req.query.status;
  res.json(filter ? missions.filter(function(m) { return m.status === filter; }) : missions);
}));

// POST /api/agents/missions — create a mission
router.post('/missions', requireAuth, asyncHandler(async (req, res) => {
  const { name, goal, agentId, context, schedule, dryRun } = req.body || {};
  if (!goal) return res.status(400).json({ error: 'goal required' });
  const mission = {
    id: uuid(),
    name: name || goal.slice(0, 40),
    goal: goal,
    agentId: agentId || 'sales-agent',
    context: context || {},
    schedule: schedule || null,
    dryRun: dryRun !== false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: req.user.email,
    lastRun: null,
    result: null
  };
  const missions = loadMissions(); missions.unshift(mission); saveMissions(missions);
  res.status(201).json(mission);
}));

// POST /api/agents/missions/:id/run — execute a mission
router.post('/missions/:id/run', requireAuth, asyncHandler(async (req, res) => {
  const missions = loadMissions();
  const idx = missions.findIndex(function(m) { return m.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Mission not found' });
  const mission = missions[idx];
  const agent = getAgent(mission.agentId) || getAgent('sales-agent');
  const dryRun = req.body.dryRun !== undefined ? req.body.dryRun : mission.dryRun;
  agent.config.dryRun = dryRun;
  agent.planner.config.dryRun = dryRun;
  missions[idx].status = 'running';
  missions[idx].lastRun = new Date().toISOString();
  saveMissions(missions);
  const result = await agent.run(mission.goal, mission.context);
  missions[idx].status = result.success ? 'completed' : 'failed';
  missions[idx].result = result;
  saveMissions(missions);
  const log = loadExecLog();
  log.unshift({ id: uuid(), missionId: mission.id, agentId: mission.agentId, goal: mission.goal, dryRun: dryRun, result: result, executedAt: new Date().toISOString(), executedBy: req.user.email });
  saveExecLog(log);
  res.json(result);
}));

// DELETE /api/agents/missions/:id
router.delete('/missions/:id', requireAuth, asyncHandler(async (req, res) => {
  saveMissions(loadMissions().filter(function(m) { return m.id !== req.params.id; }));
  res.json({ success: true });
}));

// POST /api/agents/:id/run — run agent directly
router.post('/:id/run', requireAuth, asyncHandler(async (req, res) => {
  const { goal, context, dryRun } = req.body || {};
  if (!goal) return res.status(400).json({ error: 'goal required' });
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found. Available: ' + Object.keys(AGENT_REGISTRY).join(', ') });
  agent.config.dryRun = dryRun !== false;
  agent.planner.config.dryRun = dryRun !== false;
  const result = await agent.run(goal, context || {});
  const log = loadExecLog();
  log.unshift({ id: uuid(), agentId: req.params.id, goal: goal, dryRun: dryRun !== false, result: result, executedAt: new Date().toISOString() });
  saveExecLog(log);
  res.json(result);
}));

// POST /api/agents/plan — plan only, no execution
router.post('/plan', requireAuth, asyncHandler(async (req, res) => {
  const { goal, agentId, context } = req.body || {};
  if (!goal) return res.status(400).json({ error: 'goal required' });
  const planner = new AgentPlanner(agentId || 'planner');
  const plan = await planner.planSteps(goal, context || {});
  res.json(plan);
}));

// GET /api/agents/executions — execution history
router.get('/executions', requireAuth, asyncHandler(async (req, res) => {
  res.json(loadExecLog().slice(0, Number(req.query.limit || 50)));
}));

// GET /api/agents/:id/memory — agent memory
router.get('/:id/memory', requireAuth, asyncHandler(async (req, res) => {
  const mem = getMemory(req.params.id);
  res.json(mem.dump());
}));

// DELETE /api/agents/:id/memory — clear short-term memory
router.delete('/:id/memory', requireAuth, asyncHandler(async (req, res) => {
  const mem = getMemory(req.params.id);
  mem.clearShortTerm();
  res.json({ success: true, agentId: req.params.id });
}));

module.exports = router;