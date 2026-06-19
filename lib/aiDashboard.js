// lib/aiDashboard.js
// Simple in‑memory dashboard for Molti AI via WhatsApp.
// Users can open the dashboard with "!ai dash" and choose actions.

const { runPrompt, listSkills } = require('./aiAgent');

// Map of userId -> session state
const sessions = {};

/** Send main menu */
async function sendMenu(msg) {
  const menu = `🤖 *Molti AI Dashboard*\n\n` +
    `1️⃣ Run a custom prompt\n` +
    `2️⃣ List available skills\n` +
    `3️⃣ Help / Exit\n\n` +
    `Reply with the number of your choice.`;
  await msg.reply(menu);
  sessions[msg.from] = { awaiting: true };
}

/** Handle incoming WhatsApp messages for the dashboard */
async function handleMessage(msg) {
  if (!msg.body || typeof msg.body !== 'string') return false;
  const txt = msg.body.trim();

  // Open dashboard
  if (txt.toLowerCase() === '!ai dash' || txt.toLowerCase() === '!ai dashboard') {
    await sendMenu(msg);
    return true;
  }

  const session = sessions[msg.from];
  if (session && session.awaiting) {
    if (session.awaiting === true) {
      // Expect a menu selection
      switch (txt) {
        case '1':
          await msg.reply('📝 Send the prompt you want the AI to process.');
          session.awaiting = 'prompt';
          break;
        case '2':
          const skills = listSkills();
          await msg.reply(`📚 Available skills:\n${skills.join('\n')}`);
          delete sessions[msg.from];
          break;
        case '3':
        default:
          await msg.reply('✅ Dashboard closed. Use `!ai dash` to open again.');
          delete sessions[msg.from];
      }
    } else if (session.awaiting === 'prompt') {
      // Process user prompt
      try {
        const reply = await runPrompt(txt);
        await msg.reply(`🤖 *AI Reply*\n${reply}`);
      } catch (e) {
        await msg.reply('❗ Failed to process your prompt.');
      }
      delete sessions[msg.from];
    }
    return true;
  }
  return false;
}

module.exports = { handleMessage };
