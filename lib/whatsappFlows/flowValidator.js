 'use strict';
 /**
  * flowValidator.js — validates a flow's structure against the component registry * and screen routing rules. Pure. Returns { ok, errors, warnings }. */ const componentTypes = require('./componentTypes'); function validate(flow) { const errors = []; const warnings = []; if (!flow || !Array.isArray(flow.screens) || flow.screens.length === 0) { errors.push('no_screens'); return { ok: false, errors, warnings }; } const ids = new Set(); let hasTerminal = false; let hasInput = false;

   flow.screens.forEach((s, idx) => {
     if (!s.id) errors.push('screen_missing_id@' + idx);
     if (ids.has(s.id)) errors.push('duplicate_screen_id:' + s.id);
     ids.add(s.id);
     if (s.terminal) hasTerminal = true;
     (s.layout || []).forEach((c, ci) => {
       if (!componentTypes.isValid(c.type)) errors.push('bad_component_type:' + c.type + '@' + s.id + '#' + ci);
       if (componentTypes.isInput(c.type)) { hasInput = true; if (!c.name) errors.push('input_missing_name@' + s.id + '#'
 + ci); }
       if ((c.type === 'Dropdown' || c.type === 'RadioButtonsGroup' || c.type === 'CheckboxGroup') &&
 (!Array.isArray(c.options) || !c.options.length)) errors.push('missing_options@' + s.id + '#' + ci);
     });
     if (s.nextScreenId && !flow.screens.some((x) => x.id === s.nextScreenId)) errors.push('next_screen_not_found:' +
 s.nextScreenId);
     if (!s.terminal && !s.nextScreenId && idx === flow.screens.length - 1) warnings.push('last_screen_not_terminal');
   });

   if (flow.firstScreenId && !ids.has(flow.firstScreenId)) errors.push('first_screen_not_found');
   if (!hasTerminal) warnings.push('no_terminal_screen');
   if (!hasInput) warnings.push('flow_has_no_input_fields');
   return { ok: errors.length === 0, errors, warnings };
 }
 module.exports = { validate };
