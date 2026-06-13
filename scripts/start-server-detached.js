const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'server-live.out.log');
const errPath = path.join(root, 'server-live.err.log');

function sanitizeEnv(source) {
  const env = {};
  const seen = new Set();
  for (const [key, value] of Object.entries(source || {})) {
    const low = key.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    env[key] = value;
  }
  return env;
}

const out = fs.openSync(outPath, 'a');
const err = fs.openSync(errPath, 'a');

const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  detached: true,
  stdio: ['ignore', out, err],
  env: sanitizeEnv(process.env),
  windowsHide: true
});

child.unref();

console.log(JSON.stringify({
  success: true,
  pid: child.pid,
  root,
  outPath,
  errPath
}));
