// lib/aiAgent.js
// Wrapper for a multi‑agent system using LangGraph (LangChain) and OpenAI.
// This provides a singleton `aiAgent` with the ability to load "skills" (tool functions)
// from the `lib/aiSkills` directory and execute arbitrary prompts.

const { OpenAI } = require('openai');
const { StateGraph } = require('@langchain/langgraph');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client – expects OPENAI_API_KEY in .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load skill modules (each exports a `name` and an async `run(params)` function)
function loadSkills() {
  const skillsDir = path.join(__dirname, 'aiSkills');
  const skills = {};
  if (fs.existsSync(skillsDir)) {
    const files = fs.readdirSync(skillsDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const mod = require(path.join(skillsDir, file));
        if (mod.name && typeof mod.run === 'function') {
          skills[mod.name] = mod.run;
        }
      }
    }
  }
  return skills;
}

const skills = loadSkills();

// Build a tiny graph: receive a prompt → call OpenAI → optionally invoke a skill based on a simple trigger
const graph = new StateGraph({
  stateSchema: {
    prompt: (x) => typeof x === 'string',
    response: (x) => typeof x === 'string' || x === undefined,
  },
});

// Node that calls OpenAI
graph.addNode('llm', async (state) => {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: state.prompt }],
  });
  const text = completion.choices[0].message.content.trim();
  return { ...state, response: text };
});

// Simple skill dispatcher – if the response contains a known skill name in brackets like [skillName]
graph.addNode('skill', async (state) => {
  const match = state.response.match(/\[(\w+)\]/);
  if (match && skills[match[1]]) {
    try {
      const skillResult = await skills[match[1]]({ prompt: state.prompt });
      return { ...state, response: `${state.response}\n---\nSkill (${match[1]}) result:\n${skillResult}` };
    } catch (e) {
      return { ...state, response: `${state.response}\n---\nSkill error: ${e.message}` };
    }
  }
  return state;
});

graph.addEdge('llm', 'skill');
graph.setEntryPoint('llm');

const graphRunnable = graph.compile();

// Exported helper functions
async function runPrompt(prompt) {
  const result = await graphRunnable.invoke({ prompt });
  return result.response;
}

function listSkills() {
  return Object.keys(skills);
}

module.exports = { runPrompt, listSkills, graph: graphRunnable };
