 'use strict';
 /** Maps playbook ids to suggested Flow Studio flow stubs (dry-run, registered elsewhere). */
 function expand(playbookIds) {
      return (playbookIds || []).map((id) => ({
        id: 'flow_' + id,
        label: 'Flow: ' + id,
        trigger: 'inbound_message',
        dryRun: true,
        note: 'Register in existing Flow Studio; do not auto-enable.',
      }));
 }
 module.exports = { expand };
