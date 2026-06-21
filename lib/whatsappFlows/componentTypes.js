'use strict';
const TYPES = {
  TextHeading: { input: false },
  TextBody: { input: false },
  TextCaption: { input: false },
  Image: { input: false },
  TextInput: { input: true, inputType: ['text', 'email', 'number', 'phone', 'passport', 'password'] },
  TextArea: { input: true },
  CheckboxGroup: { input: true, multi: true },
  RadioButtonsGroup: { input: true },
  Dropdown: { input: true },
  DatePicker: { input: true },
  OptIn: { input: true, boolean: true },
  Footer: { input: false, action: true },
};
function isValid(type) { return Object.prototype.hasOwnProperty.call(TYPES, type); }
function isInput(type) { return !!(TYPES[type] && TYPES[type].input); }
function optionId(o) { return typeof o === 'object' && o ? (o.id || o.value || o.title) : o; }
function validateValue(component, value) {
  const c = component || {};
  const def = TYPES[c.type];
  if (!def || !def.input) return { ok: true };
  if (c.required && (value == null || value === '' || (Array.isArray(value) && value.length === 0))) return { ok: false, error: 'required' };
  if (value == null || value === '') return { ok: true };
  if (c.type === 'TextInput' && c.inputType === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))) return { ok: false, error: 'invalid_email' };
  if (c.type === 'TextInput' && c.inputType === 'number' && Number.isNaN(Number(value))) return { ok: false, error: 'invalid_number' };
  if ((c.type === 'Dropdown' || c.type === 'RadioButtonsGroup') && Array.isArray(c.options) && !c.options.some((o) => optionId(o) === value)) return { ok: false, error: 'value_not_in_options' };
  if (c.type === 'CheckboxGroup' && Array.isArray(c.options) && Array.isArray(value) && value.some((v) => !c.options.some((o) => optionId(o) === v))) return { ok: false, error: 'value_not_in_options' };
  if (c.type === 'OptIn' && typeof value !== 'boolean') return { ok: false, error: 'optin_must_be_boolean' };
  return { ok: true };
}
module.exports = { TYPES, isValid, isInput, validateValue };
