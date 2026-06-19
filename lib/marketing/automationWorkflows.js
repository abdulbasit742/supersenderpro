const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/marketing_automation.json');
function load() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { workflows: [] }; } catch { return { workflows: [] }; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function createWorkflow(name, trigger, actions) {
  const data = load();
  const workflow = {
    id: `WF-${Date.now()}`,
    name,
    trigger,
    actions,
    active: true,
    createdAt: new Date().toISOString()
  };
  data.workflows.push(workflow);
  save(data);
  return workflow;
}

module.exports = { createWorkflow };
