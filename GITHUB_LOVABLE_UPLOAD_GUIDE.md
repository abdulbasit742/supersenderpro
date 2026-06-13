# GitHub/Lovable Upload Guide

Why direct upload failed:
- GitHub web upload rejects large files and often struggles with big zip files.
- Do not upload node_modules, .git, real .env, auth sessions, token files, exe files, or cache folders.

Best method:
1. Create a new empty GitHub repo.
2. Open PowerShell in this folder.
3. Run:
   powershell -ExecutionPolicy Bypass -File .\PUSH_TO_GITHUB.ps1 -RepoUrl "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
4. In Lovable, choose Import from GitHub and select that repo.

Use this folder for complete source:
D:\SuperSenderPro\github-lovable-clean

Use ultra-light folder if upload still fails:
D:\SuperSenderPro\github-lovable-ultra-light

Backend note:
Lovable should run frontend/dashboard. WhatsApp backend needs a persistent Node server separately.
