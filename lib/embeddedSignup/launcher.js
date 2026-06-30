'use strict';
/**
 * lib/embeddedSignup/launcher.js - builds the PUBLIC config the frontend launcher needs.
 * Returns ONLY non-secret values (appId, configId, graph version). The app secret never
 * leaves the server. The browser uses these with the Facebook JS SDK (FB.login + config_id).
 */
const cfg = require('./config');

function publicConfig() {
  const c = cfg.config;
  return {
    enabled: c.enabled,
    live: cfg.isLive(),
    appId: c.appId || null,
    configId: c.configId || null,
    graphVersion: c.graphVersion,
    ready: !!(c.appId && c.configId),
    note: cfg.isLive() ? 'live' : 'simulation - set EMBEDDED_SIGNUP_LIVE=true + META creds to go live',
  };
}

/** Minimal client snippet (for docs / quick embed) showing how to launch ES with our config. */
function clientSnippet() {
  const c = cfg.config;
  return [
    '<!-- 1) Load the Facebook JS SDK, then: -->',
    '<script>',
    '  window.fbAsyncInit = function () {',
    '    FB.init({ appId: "' + (c.appId || 'YOUR_APP_ID') + '", autoLogAppEvents: true, xfbml: true, version: "' + c.graphVersion + '" });',
    '  };',
    '</script>',
    '',
    '<!-- 2) Connect button -->',
    '<button onclick="launchWhatsAppSignup()">Connect WhatsApp</button>',
    '<script>',
    '  function launchWhatsAppSignup() {',
    '    FB.login(function (response) {',
    '      var code = response && response.authResponse && response.authResponse.code;',
    '      if (!code) return;',
    '      // 3) Send the code to our backend to finish onboarding:',
    '      fetch("/api/embedded-signup/callback", {',
    '        method: "POST", headers: { "content-type": "application/json" },',
    '        body: JSON.stringify({ code: code })',
    '      }).then(function (r) { return r.json(); }).then(console.log);',
    '    }, { config_id: "' + (c.configId || 'YOUR_CONFIG_ID') + '", response_type: "code", override_default_response_type: true });',
    '  }',
    '</script>',
  ].join('\n');
}

module.exports = { publicConfig, clientSnippet };
