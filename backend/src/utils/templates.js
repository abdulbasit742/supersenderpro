function renderTemplate(template = '', variables = {}) {
  let output = String(template || '');
  output = output.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key) => {
    const value = variables[String(key).trim()] ?? '';
    return value === null || value === undefined ? '' : String(value);
  });
  output = output.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, choices) => {
    const parts = choices.split('|').map(x => x.trim()).filter(Boolean);
    return parts.length ? parts[Math.floor(Math.random() * parts.length)] : '';
  });
  return output;
}

module.exports = { renderTemplate };
