'use strict';
const cfg=require('./config');
const SECRET_LIKE=/(sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_\-]{16,}|ghp_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/;
function publicPageSafetyScanner(){ const files=cfg.walk('public',{exts:['.html','.js','.css']}); const secretLikeFindingsPreview=[]; files.forEach(f=>{ const src=cfg.readSafe(f)||''; if(SECRET_LIKE.test(src)) secretLikeFindingsPreview.push({file:f,finding:'secret_like_string_detected'}); }); return cfg.base({publicFilesScannedPreview:files.length, secretLikeFindingsPreview, note:'pattern-only scan; matched values are NOT returned'}); }
module.exports={ publicPageSafetyScanner };
