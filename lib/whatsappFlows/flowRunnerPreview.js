 'use strict';
 /**
  * flowRunnerPreview.js — simulates a customer walking through a flow in-chat.
  * Given submitted answers per screen, it validates inputs, advances screens, and
  * reports the next screen or completion. NEVER sends a WhatsApp message.
  */
 const componentTypes = require('./componentTypes');
 const validator = require('./flowValidator');

 function screenById(flow, id) { return (flow.screens || []).find((s) => s.id === id) || null; }


 function validateScreen(screen, answers) {
   const errors = [];
   (screen.layout || []).forEach((c) => {
     if (!componentTypes.isInput(c.type)) return;
     const v = componentTypes.validateValue(c, answers ? answers[c.name] : undefined);
     if (!v.ok) errors.push({ field: c.name, error: v.error });
   });

  return errors;
}

function run(flow, opts) {
const o = opts || {};
  const structure = validator.validate(flow);
  if (!structure.ok) return { ok: false, dryRun: true, blockers: structure.errors };


  const startId = o.screenId || flow.firstScreenId;
  const screen = screenById(flow, startId);
  if (!screen) return { ok: false, dryRun: true, blockers: ['screen_not_found'] };


  const fieldErrors = validateScreen(screen, o.answers);
  if (fieldErrors.length) {
    return { ok: true, dryRun: true, liveSend: false, flowId: flow.id, currentScreenId: screen.id, validationErrors:
fieldErrors, advanced: false, warnings: ['fix_validation_errors'], blockers: [] };
}


  const nextId = screen.nextScreenId;
  const isTerminal = screen.terminal || !nextId;
  return {
      ok: true, dryRun: true, liveSend: false, flowId: flow.id,
      currentScreenId: screen.id,
      capturedPreview: pickInputs(screen, o.answers),
      advanced: !isTerminal,
      nextScreenId: isTerminal ? null : nextId,
      completedPreview: isTerminal,
      warnings: [], blockers: [],
  };
}


function pickInputs(screen, answers) {
const out = {};
(screen.layout || []).forEach((c) => { if (componentTypes.isInput(c.type) && answers && answers[c.name] != null)
out[c.name] = answers[c.name]; });
  return out;
}


// Full dry walk-through: given a map of screenId -> answers, play the whole flow.
function walk(flow, answersByScreen) {
const steps = [];
  let screenId = flow.firstScreenId;
  const guard = (flow.screens || []).length + 2;
  let count = 0;
  while (screenId && count < guard) {
      count++;
      const r = run(flow, { screenId, answers: (answersByScreen || {})[screenId] });
      steps.push(r);
      if (!r.ok || r.validationErrors || r.completedPreview) break;
      screenId = r.nextScreenId;
  }
return { ok: true, dryRun: true, flowId: flow.id, steps, completedPreview: steps.length > 0 && !!steps[steps.length -
1].completedPreview };
}


module.exports = { run, walk, validateScreen };
