# Antigravity Safe Git Push Prompt

Use this prompt in Antigravity when you want it to sync and push SuperSender Pro work safely.

```text
You are working on SuperSender Pro.

Primary GitHub repo:
https://github.com/abdulbasit742/supersenderpro.git

Important local paths:
- Live app: D:\SuperSenderPro\supersender-pro-final
- Main branch checkout: D:\SuperSenderPro\repo-ready-to-push\supersenderpro-update
- Lovable branch checkout: D:\SuperSenderPro\repo-ready-to-push\supersenderpro-lovable-deploy

Branches:
- main
- lovable-deploy

Goal:
Push all completed safe source work to GitHub, but do not leak secrets, sessions, customer data, runtime logs, or generated media.

Strict safety rules:
1. Never use blind `git add .` in the live app folder.
2. Never commit or push:
   - .env
   - .cloudflare-tunnel-token
   - .wa-auth/
   - .baileys-auth/
   - .wwebjs_cache/
   - data/*.json runtime/customer/payment/log files
   - uploads/
   - node_modules/
   - node-local.exe
   - browser cache, logs, WhatsApp sessions, API keys, account dumps
3. Stage only explicit safe source/docs/config files.
4. Before every commit, run a secret scan on staged files.
5. If a file may contain customer data, payment records, API keys, access tokens, or WhatsApp auth data, stop and ask the owner.

Safe sync workflow:
1. Check live source status:
   cd /d D:\SuperSenderPro\supersender-pro-final
   git status --short -- server.js README.md .env.example scripts/live scripts/claw-runtime

2. Sync only safe source files from live app to both clean checkouts when needed:
   - server.js
   - README.md
   - .env.example
   - scripts/live/*.ps1
   - scripts/claw-runtime/*.ps1
   - docs/*.md

3. In each clean checkout, verify:
   D:\SuperSenderPro\supersender-pro-final\node-local.exe --check server.js

4. Secret scan the exact staged candidate files:
   rg -n "(tvly-dev-|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|EAAB[A-Za-z0-9]|xox[baprs]-|BEGIN PRIVATE KEY|NVIDIA_API_KEY=\S+|TAVILY_API_KEY=\S+|FB_PAGE_ACCESS_TOKEN=\S+|GOOGLE_PRIVATE_KEY=\S+)" server.js README.md .env.example scripts docs

5. Check Git remote and branch:
   git branch --show-current
   git remote -v
   git status --short

6. Stage only safe intended files, for example:
   git add server.js README.md .env.example scripts/live scripts/claw-runtime docs

7. Commit:
   git commit -m "Describe safe source update"

8. Push current branch:
   git push origin main
   or:
   git push origin lovable-deploy

9. Final verification:
   git status --short
   git log --oneline -3
   git ls-remote origin main lovable-deploy

10. Report:
   - branch pushed
   - commit hash
   - files changed
   - validation commands run
   - anything intentionally not pushed

Current known safe live endpoints:
- http://localhost:3001/api/health
- http://localhost:3001/pc-agent-control
- http://localhost:3001/claw-runtime
- http://localhost:3001/ai-automation-hub

If the server is down, first check:
D:\SuperSenderPro\supersender-pro-final\logs\supersender-watchdog.log

Never enable live PC actions, payment approval, social publishing, or WhatsApp mass sending without explicit owner approval.
```
