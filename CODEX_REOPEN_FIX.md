# Codex Reopen Fix

If Codex shows:

`cannot resume running thread ... with stale path`

it is a Codex Desktop session resume bug, not a SuperSender project bug. Windows is showing the same session file in two forms:

- `C:\Users\...`
- `\\?\C:\Users\...`

Codex sometimes treats them as different paths.

## Correct Way To Open This Project

1. Do not resume the old running thread that shows the stale-path error.
2. Open a new Codex task from this folder:

   `D:\SuperSenderPro\supersender-pro-final`

3. If you need to start the app first, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "D:\SuperSenderPro\supersender-pro-final\OPEN_PROJECT_FROM_D.ps1"
   ```

4. Then open:

   - `http://localhost:3001`
   - `http://localhost:3001/wa-channel-qr`

## If The Error Keeps Coming Back

Close Codex completely, then run:

```powershell
powershell -ExecutionPolicy Bypass -File "D:\SuperSenderPro\supersender-pro-final\FIX_CODEX_STALE_THREAD.ps1"
```

This script backs up the stale `019de8d4-e04b-7bb2-bba0-5ef84a1b01df` session file, disables it, and removes the stale UI references from `.codex-global-state.json`.

## Do Not Delete

Do not delete the large `.codex\sessions\...\rollout-*.jsonl` file while a Codex thread is open. It may be the active conversation history.
