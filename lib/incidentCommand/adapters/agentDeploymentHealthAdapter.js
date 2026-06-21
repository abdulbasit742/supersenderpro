'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['lib/groupCommerce/agentRegistry.js', 'src/modules/intent', 'src/modules/kb',
'lib/aiAgents']);
  if (!present) return b.unavailable('AI Agents');
  const provider = b.envSet('OPENAI_API_KEY') || b.envSet('ANTHROPIC_API_KEY') || b.anyExists(['src/modules/kb']);
  return provider ? b.record('healthy', 'AI agents present with a provider or local KB', { category: 'ai_agents' }) :
b.record('warning', 'AI agents present but no provider/local KB detected', { category: 'ai_agents', recommendedFix:
'Configure an AI provider or enable local KB.' });
}
module.exports = { health };
