#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const C = { green:'[32m', red:'[31m', yellow:'[33m', blue:'[34m', reset:'[0m' };
const ok  = msg => console.log(C.green  + '✅ ' + msg + C.reset);
const warn= msg => console.log(C.yellow + '⚠️  ' + msg + C.reset);
const info= msg => console.log(C.blue   + 'ℹ️  ' + msg + C.reset);

async function main() {
  console.log('═'.repeat(55));
  console.log('  SuperSender Pro — n8n Workflow Importer');
  console.log('═'.repeat(55));

  const workflowsDir = path.join(ROOT, 'n8n-workflows');
  if (!fs.existsSync(workflowsDir)) { warn('n8n-workflows/ not found'); return; }
  const files = fs.readdirSync(workflowsDir).filter(function(f) { return f.endsWith('.json'); });
  info('Found ' + files.length + ' workflows: ' + files.join(', '));

  const N8N_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
  const N8N_USER = process.env.N8N_USER || 'admin';
  const N8N_PASS = process.env.N8N_PASSWORD || 'supersender123';

  const axios = require('axios').create({
    baseURL: N8N_URL,
    auth: { username: N8N_USER, password: N8N_PASS },
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });

  let imported = 0, failed = 0;
  for (const file of files) {
    const filePath = path.join(workflowsDir, file);
    try {
      const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      await axios.post('/api/v1/workflows', workflow);
      ok('Imported: ' + file);
      imported++;
    } catch(e) {
      const errMsg = e.response ? e.response.status + ' ' + JSON.stringify(e.response.data).slice(0,80) : e.message;
      warn('Failed ' + file + ': ' + errMsg);
      failed++;
    }
  }

  console.log('');
  info('Imported: ' + imported + ' | Failed: ' + failed);
  if (failed > 0) {
    info('Tip: Make sure n8n is running: docker-compose up -d n8n');
    info('Or import manually at: ' + N8N_URL);
  }
}

main().catch(console.error);