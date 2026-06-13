# Encrypted Private Backup Parts

These files are encrypted private backup chunks for SuperSender Pro.

They may contain everything from the local project once decrypted: .env, Git history, WhatsApp auth/session, runtime data, uploads, node_modules, and local tools.

The password is intentionally NOT stored in GitHub.

Local password file created on this PC:

`	ext
D:\SuperSenderPro\private-backups\GITHUB_ENCRYPTED_PRIVATE_BACKUP_PASSWORD-20260613-134032.txt
`

Restore command from repo root:

`powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-encrypted-private-backup.ps1 -PartsDir .\private-backup-encrypted -OutZip .\supersenderpro-private-restored.zip
`

Then enter the private password when prompted.
