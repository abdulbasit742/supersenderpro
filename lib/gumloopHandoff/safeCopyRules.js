'use strict';
/**
* safeCopyRules.js — declarative copy policy for the Gumloop handoff.
   * SAFE_TO_COPY / NEVER_COPY / UNKNOWN_REVIEW classification inputs.
   * No I/O; pure rule data + matchers.
   */

const SAFE_ROOTS = [
 'server.js', 'package.json', 'package-lock.json', '.env.example', '.gitignore', 'README.md',
    'lib/', 'routes/', 'public/', 'docs/', 'scripts/', 'tests/', 'demo/',
];

// artifacts/*.md are safe; artifacts/*.json only if redacted + non-private (checked elsewhere)
const SAFE_ARTIFACT_MD = /^artifacts\/.*\.md$/;
const SAFE_ARTIFACT_JSON = /^artifacts\/.*\.json$/;


const NEVER_COPY = [
    '.env', '.env.*', 'node_modules/', 'logs/', 'uploads/', 'data/',
    'sessions/', '.wa-auth/', '.baileys-auth/', 'baileys_auth*/', 'browser-cache/',
    'private-backups/', 'exports/', '*.zip', '*.tar', '*.tar.gz',
    '*.pem', '*.key', '*token*', '*secret*', 'artifacts/*raw*', 'artifacts/*private*',
];


const NEVER_COPY_REGEX = [
 /(^|\/)\.env($|\.)/i,
    /(^|\/)node_modules\//i,
    /(^|\/)(logs|uploads|data|sessions|browser-cache|private-backups|exports)\//i,
    /(^|\/)\.wa-auth\//i,
    /(^|\/)\.baileys-auth\//i,
    /(^|\/)baileys_auth[^/]*\//i,
    /\.(zip|tar|tar\.gz|pem|key)$/i,
    /token/i,
    /secret/i,
    /artifacts\/.*(raw|private)/i,
];

// runtime-data-looking files even inside otherwise-safe roots
const RUNTIME_DATA_REGEX = [
 /(^|\/)data\/.*\.json$/i,
    /(^|\/)(logs|uploads|sessions)\//i,
];

function underSafeRoot(rel) {
    return SAFE_ROOTS.some((r) => (r.endsWith('/') ? rel.startsWith(r) : rel === r));
}

function matchesNeverCopy(rel) {
    return NEVER_COPY_REGEX.some((re) => re.test(rel));
}

module.exports = {
    SAFE_ROOTS, NEVER_COPY, NEVER_COPY_REGEX, RUNTIME_DATA_REGEX,
    SAFE_ARTIFACT_MD, SAFE_ARTIFACT_JSON, underSafeRoot, matchesNeverCopy,
};
