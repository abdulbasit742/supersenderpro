'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { createChannelAutomationCenter } = require('../../lib/channelAutomationCenter');

async function run() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-content-flow-'));
  const center = createChannelAutomationCenter({ dataDir });

  const target = center.addTarget({
    name: 'Main WhatsApp Channel',
    channelId: '120363target@newsletter',
    platform: 'whatsapp',
    branding: '-- SuperSender Pro'
  });

  const source = center.addSource({
    name: 'Dealer Group',
    channelId: '120363source@g.us',
    sourceType: 'whatsapp_group',
    category: 'deals',
    requireApproval: true,
    targets: [target.id]
  });

  const preview = center.previewContentFlow({
    groupId: source.channelId,
    sourceType: 'whatsapp_group',
    text: 'ChatGPT Plus stock available. Rs 999 only.'
  });

  assert.strictEqual(preview.accepted, true, 'preview should accept configured group source');
  assert.strictEqual(preview.targets.length, 1, 'preview should map one target');
  assert.ok(preview.targets[0].previewText.includes('SuperSender Pro'), 'branding should be applied');

  const ingested = await center.ingestGroupChatMessage({
    groupId: source.channelId,
    text: 'ChatGPT Plus stock available. Rs 999 only.',
    sender: '923001112233'
  }, { force: true, publishNow: false });

  assert.strictEqual(ingested.accepted, true, 'group message should be accepted');
  assert.strictEqual(ingested.queued, true, 'group message should be queued');
  assert.ok(Array.isArray(ingested.queueIds) && ingested.queueIds.length === 1, 'queue id should be returned');

  const queue = center.getQueue();
  assert.strictEqual(queue.length, 1, 'queue should have one item');
  assert.strictEqual(queue[0].status, 'pending_approval', 'approval should be required');
  assert.strictEqual(queue[0].platform, 'whatsapp', 'target platform should be WhatsApp');

  const status = center.contentFlowStatus();
  assert.strictEqual(status.byType.whatsapp_group, 1, 'status should count group source');
  assert.strictEqual(status.pendingApproval, 1, 'status should count pending approval');

  console.log('channel automation content-flow smoke: PASS');
}

run().catch((error) => {
  console.error('channel automation content-flow smoke: FAIL');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
