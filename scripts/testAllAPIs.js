// ============================================================
// SuperSender Pro - API Test Suite
// Run: node scripts/testAllAPIs.js
// ============================================================

const http = require('http');

const HOST = '127.0.0.1';
const PORT = 3001;
let passed = 0;
let failed = 0;

function request(method, path, body = null) {
  return new Promise(resolve => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', () => resolve({ status: 0, data: '' }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ status: 0, data: '' });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function test(name, method, path, expectedStatus = 200, body = null) {
  const res = await request(method, path, body);
  const ok = res.status === expectedStatus ||
    (expectedStatus === 200 && res.status >= 200 && res.status < 300);
  const line = `${method.padEnd(6)} ${path.padEnd(44)} ${res.status}`;
  if (ok) {
    console.log(`OK   ${line} ${name}`);
    passed += 1;
  } else {
    console.log(`FAIL ${line} expected ${expectedStatus} - ${name}`);
    failed += 1;
  }
}

async function testJson(name, method, path, validator, body = null) {
  const res = await request(method, path, body);
  let parsed = null;
  try {
    parsed = JSON.parse(res.data || '{}');
  } catch (error) {
    console.log(`FAIL ${method.padEnd(6)} ${path.padEnd(44)} ${res.status} invalid JSON - ${name}`);
    failed += 1;
    return;
  }
  try {
    if (!(res.status >= 200 && res.status < 300)) throw new Error(`expected 2xx, got ${res.status}`);
    validator(parsed);
    console.log(`OK   ${method.padEnd(6)} ${path.padEnd(44)} ${res.status} ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`FAIL ${method.padEnd(6)} ${path.padEnd(44)} ${res.status} ${error.message} - ${name}`);
    failed += 1;
  }
}

async function runTests() {
  console.log('\nSuperSender Pro - API Test Suite\n');
  console.log('='.repeat(70));
  const suiteRunId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  console.log('\nCore:');
  await test('Health', 'GET', '/api/health');
  await test('Dashboard summary', 'GET', '/api/dashboard/summary');
  await test('Settings get', 'GET', '/api/settings');

  console.log('\nWhatsApp:');
  await test('WA Status', 'GET', '/api/wa/status');
  await test('WA QR', 'GET', '/api/wa/qr');
  await test('WA Chats', 'GET', '/api/wa/chats');
  await test('WA Contacts', 'GET', '/api/wa/contacts');
  await testJson('Bot welcome menu includes AI Tools and Giveaway', 'POST', '/api/laptop-bot/handle', (body) => {
    const reply = String(body.reply || '');
    if (!reply.includes('AI Tools')) throw new Error('welcome reply missing AI Tools');
    if (!reply.includes('Free Giveaway')) throw new Error('welcome reply missing Free Giveaway');
  }, { number: `api-suite-welcome-${suiteRunId}`, name: 'API Tester', message: 'hi' });
  await testJson('Giveaway flow returns Moclaw announcement and image asset', 'POST', '/api/laptop-bot/handle', (body) => {
    const reply = String(body.reply || '');
    const assets = Array.isArray(body.mediaAssets) ? body.mediaAssets : [];
    if (!reply.toLowerCase().includes('moclaw')) throw new Error('giveaway reply missing Moclaw');
    if (!reply.includes('https://moclaw.ai')) throw new Error('giveaway reply missing link');
    if (!assets.some(asset => String(asset.source || '').includes('moclaw-deepseek-v4-free-trial.png'))) {
      throw new Error('giveaway image asset missing');
    }
  }, { number: `api-suite-giveaway-${suiteRunId}`, name: 'API Tester', message: '2' });

  console.log('\nProducts:');
  await test('Products list', 'GET', '/api/products');
  await test('Products search/filter', 'GET', '/api/products?q=hp');
  await test('Products stats', 'GET', '/api/products/stats');

  console.log('\nCustomers:');
  await test('Customers list', 'GET', '/api/customers');
  await test('Customer segments', 'GET', '/api/customers/segments');
  await test('Customers search', 'GET', '/api/search/customers?q=test');
  await test('Contacts export', 'GET', '/api/contacts/export');
  await test('Contacts sync', 'POST', '/api/contacts/sync');
  await test('CRM sync status', 'GET', '/api/crm-sync/status');
  await test('CRM sync import validation', 'POST', '/api/crm-sync/import', 400, { provider: 'hubspot', contacts: [] });
  await test('CRM sync dry export', 'POST', '/api/crm-sync/export', 200, { provider: 'hubspot' });

  console.log('\nPayments:');
  await test('Payments list', 'GET', '/api/payments');
  await test('Financial analytics', 'GET', '/api/analytics/financials');

  console.log('\nCommerce:');
  await test('Commerce settings', 'GET', '/api/commerce/settings');
  await test('Commerce events', 'GET', '/api/commerce/events');
  await test('Magento webhook', 'POST', '/api/commerce/webhook/magento', 200, {
    increment_id: `MAG-${Date.now()}`,
    customer_firstname: 'API',
    customer_lastname: 'Tester',
    customer_phone: '03001234567',
    grand_total: 2500,
    items: [{ name: 'Magento Test Item', qty: 1, price: 2500 }]
  });

  console.log('\nCampaigns:');
  await test('Campaigns list', 'GET', '/api/campaigns');
  await test('Polls list', 'GET', '/api/polls');
  await test('Poll create', 'POST', '/api/polls', 200, { question: 'Best product?', options: ['Laptops', 'AI Tools'] });
  await test('Templates list', 'GET', '/api/templates');
  await test('AI template generator', 'POST', '/api/templates/generate', 200, { goal: 'welcome offer', category: 'sales', product: 'ChatGPT Plus', count: 2, skipAI: true });
  await test('Template dynamic render', 'POST', '/api/templates/render-preview', 200, { template: '{Hi|Hello} {{name}}, order {{invoice_no}} ready.', variables: { name: 'Ali', invoice_no: 'INV-1' }, count: 2 });
  await test('Text rotation preview', 'POST', '/api/tools/text-rotation-preview', 200, { message: '{Hi|Hello|Salam} {{name}}', variables: { name: 'Ali' }, count: 4 });
  await test('Merge fields list', 'GET', '/api/merge-fields');
  await test('Merge fields preview', 'POST', '/api/merge-fields/preview', 200, { template: 'Hi {{name}}, your city is {{city}}.', variables: { name: 'Ali', city: 'Lahore' } });
  await test('Quick replies', 'GET', '/api/quick-replies');

  console.log('\nBusiness Tools:');
  await test('Number generator', 'POST', '/api/tools/number-generator', 200, { countryCode: '92', prefix: '300', start: 1, end: 3, digits: 7 });
  await test('Number dedupe', 'POST', '/api/tools/dedupe-numbers', 200, { numbers: ['03001234567', '923001234567', '03111222333'] });
  await test('Number filter', 'POST', '/api/tools/number-filter', 200, { numbers: ['03001234567', '923001234567', 'abc'] });
  await test('Interactive preview', 'POST', '/api/tools/interactive-preview', 200, { type: 'buttons', title: 'Quick options', body: 'Choose one', options: ['Chat now', 'View Price'] });
  await test('Licenses list', 'GET', '/api/licenses');
  await test('License generate', 'POST', '/api/licenses/generate', 200, { customerName: 'API Test', customerPhone: '03001234567', plan: 'starter', days: 7 });
  await test('Update status', 'GET', '/api/update/status');
  await test('Update check no manifest', 'POST', '/api/update/check', 200, {});
  await test('Privacy status', 'GET', '/api/privacy/status');
  await test('Warmup guide', 'GET', '/api/safety/warmup-guide');
  await test('Send unknown number', 'POST', '/api/wa/send-unknown', 400, { number: '03001234567', text: '' });
  await test('Send contact validation', 'POST', '/api/wa/send-contact', 400, { number: '03001234567' });
  await test('Send location validation', 'POST', '/api/wa/send-location', 400, { number: '03001234567', latitude: 'bad' });
  await test('Chat control get', 'GET', '/api/wa/chat-control/923001234567@c.us');
  await test('Chat control update', 'POST', '/api/wa/chat-control/923001234567@c.us', 200, { botPaused: false, aiPaused: false });
  await test('Catalog list', 'GET', '/api/catalogs');
  await test('Catalog create', 'POST', '/api/catalogs', 200, { title: 'API Catalog', description: 'API test', limit: 2 });

  console.log('\nSupport & Links:');
  await test('Support tickets list', 'GET', '/api/issues');
  await test('Link tracking list', 'GET', '/api/links');

  console.log('\nWebhooks:');
  await test('Webhook list', 'GET', '/api/webhooks');
  await test('Webhook event catalog', 'GET', '/api/webhooks/events');
  await test('Webhook delivery logs', 'GET', '/api/webhooks/logs');
  await test('Webhook test validates URL', 'POST', '/api/webhooks/test', 400, { url: 'bad-url' });

  console.log('\nSocial Platforms:');
  await test('Social status', 'GET', '/api/social/status');
  await test('Social accounts', 'GET', '/api/social/accounts');
  await test('Social OAuth URLs', 'GET', '/api/social/oauth/urls');
  await test('Social posts', 'GET', '/api/social/posts');
  await test('Social events', 'GET', '/api/social/events');
  await test('Social publish validation', 'POST', '/api/social/publish', 400, { platform: 'facebook', message: '' });
  await test('Social comments list', 'GET', '/api/social/comments');
  await test('Social comment validation', 'POST', '/api/social/comment', 400, { platform: 'facebook', message: '' });
  await test('Social auto poster status', 'GET', '/api/social/auto-poster/status');
  await test('Social auto poster jobs', 'GET', '/api/social/auto-poster/jobs');
  await test('Social auto poster scan', 'POST', '/api/social/auto-poster/scan', 200, {});
  await test('Social auto poster run', 'POST', '/api/social/auto-poster/run', 200, { force: true, limit: 1 });
  await test('Social generic webhook', 'POST', '/webhook/social/linkedin', 200, { type: 'api-suite', message: 'hello from api test' });
  await test('AI video agent status', 'GET', '/api/video-agent/status');
  await test('AI video providers', 'GET', '/api/video-agent/providers');
  await test('AI video job validation', 'POST', '/api/video-agent/jobs', 400, { prompt: '' });
  await test('AI video folder scan', 'POST', '/api/video-agent/scan', 200, {});
  await test('AI video run', 'POST', '/api/video-agent/run', 200, { force: true, limit: 1 });

  console.log('\nFlow Builder:');
  await test('Flows list', 'GET', '/api/flows');
  await test('Flow node types', 'GET', '/api/flows/node-types');
  await test('Flow submissions', 'GET', '/api/flows/submissions');
  await test('Flow template node', 'POST', '/api/flows/test-node', 200, {
    node: { type: 'template_message', fallback: 'Hi {{name}}, template fallback ready.' },
    name: 'API Test',
    number: '923001234567',
    message: 'hello'
  });
  await test('Flow test node', 'POST', '/api/flows/test-node', 200, {
    node: {
      type: 'google_sheet',
      fields: {
        name: '{name}',
        number: '{number}',
        message: '{message}'
      }
    },
    name: 'API Test',
    number: '923001234567',
    message: 'hello'
  });

  console.log('\nSafety Center:');
  await test('Safety settings', 'GET', '/api/safety/settings');
  await test('Safety status', 'GET', '/api/safety/status');
  await test('Safety validate', 'POST', '/api/safety/validate', 200, {
    recipients: [{ name: 'Test Lead', number: '03001234567' }, { number: 'bad-number' }]
  });

  console.log('\nPlans:');
  await test('Plans list', 'GET', '/api/plans');

  console.log('\nAI Agents:');
  await test('Agents list', 'GET', '/api/agents');
  await test('Agents chat', 'POST', '/api/agents/chat', 200, { agent: 'Sales Agent', message: 'hello' });

  console.log('\nAnalytics:');
  await test('Message analytics', 'GET', '/api/analytics/messages');
  await test('Message logs', 'GET', '/api/logs');
  await test('Alerts list', 'GET', '/api/alerts');
  await test('Alert create', 'POST', '/api/alerts', 200, { title: 'API Test Alert', message: 'Test alert from API suite', severity: 'info' });

  console.log('\nAutomations:');
  await test('Automations status', 'GET', '/api/automations/status');
  await test('Unknown automation trigger', 'POST', '/api/automations/trigger/unknown', 404, {});

  console.log('\nPaperclip:');
  await test('Paperclip status', 'GET', '/api/paperclip/status');
  await test('Unknown Paperclip trigger', 'POST', '/api/paperclip/trigger', 400, { action: 'unknown' });

  console.log('\nMessenger:');
  await test('Messenger status', 'GET', '/api/messenger/status');

  console.log('\nReal Estate:');
  await test('RE Signup bad request', 'POST', '/api/re/signup', 400, {});
  await test('RE Login bad request', 'POST', '/api/re/login', 400, {});

  console.log('\nPrice Intel:');
  await test('Price Intel list', 'GET', '/api/price-intel');

  console.log('\nGroups:');
  await test('Groups list', 'GET', '/api/groups/list');
  await test('Group analytics', 'GET', '/api/groups/analytics');
  await test('Hot signals', 'GET', '/api/groups/hot-signals');
  await test('Group auto-replies', 'GET', '/api/groups/auto-replies');
  await test('Group prices', 'GET', '/api/group-prices');
  await test('Broadcast log', 'GET', '/api/groups/broadcast-log');
  await test('Group member send validation', 'POST', '/api/groups/test@g.us/members/send', 400, { message: '' });

  console.log('\nBulk Ops:');
  await test('Customers bulk delete validation', 'POST', '/api/customers/bulk-delete', 400, { ids: [] });

  console.log('\nReminders:');
  await test('Reminders list', 'GET', '/api/reminders');

  console.log('\nPages:');
  await test('Main page', 'GET', '/');
  await test('RE Signup page', 'GET', '/re-signup.html');
  await test('RE Login page', 'GET', '/re-login.html');
  await test('RE Dashboard page', 'GET', '/re-dashboard.html');
  await test('Paperclip panel page', 'GET', '/paperclip-panel.html');

  console.log('\n' + '='.repeat(70));
  console.log(`\nResults: ${passed} passed | ${failed} failed`);

  if (failed === 0) {
    console.log('\nALL APIs WORKING - 100% Ready.\n');
  } else {
    console.log(`\n${failed} APIs need fixing. Check route output above.\n`);
    process.exitCode = 1;
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
