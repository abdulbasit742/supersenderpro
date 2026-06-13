const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

if (!fs.existsSync(clientPath)) {
  console.log('[postinstall] whatsapp-web.js Client.js not found; skipping compatibility patch');
  process.exit(0);
}

let src = fs.readFileSync(clientPath, 'utf8');
let changed = false;

const originalDebugProbe = "            res = await this.pupPage.evaluate('window.Debug?.VERSION != undefined');";
const patchedDebugProbe = `            try {
                res = await this.pupPage.evaluate('window.Debug?.VERSION != undefined');
            } catch (e) {
                res = false;
            }`;

if (!src.includes(patchedDebugProbe) && src.includes(originalDebugProbe)) {
  src = src.replace(originalDebugProbe, patchedDebugProbe);
  changed = true;
}

const originalAuthState = `        const needAuthentication = await this.pupPage.evaluate(async () => {
            let state = window.AuthStore.AppState.state;`;
const patchedAuthState = `        const needAuthentication = await (async () => {
            for (let authAttempt = 0; authAttempt < 25; authAttempt++) {
                try {
                    return await this.pupPage.evaluate(async () => {
            if (!window.AuthStore || !window.AuthStore.AppState) throw new Error('AuthStore not ready');
            let state = window.AuthStore.AppState.state;`;

if (!src.includes(patchedAuthState) && src.includes(originalAuthState)) {
  src = src.replace(originalAuthState, patchedAuthState);
  const originalAuthStateEnd = `            state = window.AuthStore.AppState.state;
            return state == 'UNPAIRED' || state == 'UNPAIRED_IDLE';
        });`;
  const patchedAuthStateEnd = `            state = window.AuthStore.AppState.state;
            return state == 'UNPAIRED' || state == 'UNPAIRED_IDLE';
                    });
                } catch (e) {
                    if (!/Execution context was destroyed|Cannot find context|Navigating frame was detached|Target closed|Session closed|AuthStore not ready|AppState/i.test(e && e.message || String(e))) throw e;
                    await new Promise(r => setTimeout(r, 500));
                }
            }
            throw new Error('Timed out waiting for WhatsApp auth state');
        })();`;
  if (src.includes(originalAuthStateEnd)) {
    src = src.replace(originalAuthStateEnd, patchedAuthStateEnd);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(clientPath, src);
  console.log('[postinstall] applied whatsapp-web.js navigation compatibility patch');
} else {
  console.log('[postinstall] whatsapp-web.js compatibility patch already applied or not needed');
}
