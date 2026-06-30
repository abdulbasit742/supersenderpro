# Backup + Restore (json tenant store)

Point-in-time snapshots of the json data store - for cheap safety before risky ops (bulk erase, migration) and routine backups while on the json driver.

## Create a snapshot
```bash
node scripts/backup-snapshot.js [label]
# -> backups/snapshot-2026-06-30T...-label.json  (N tenants, M rows)
```
Captures the entire `data/tenant_store` tree into one timestamped JSON file under `backups/`.

## List
`listSnapshots()` / the backup script print available snapshots (file, size, time).

## Restore (DRY-RUN by default)
```bash
node scripts/restore-snapshot.js backups/snapshot-....json           # shows plan only
node scripts/restore-snapshot.js backups/snapshot-....json --apply    # write it back
node scripts/restore-snapshot.js backups/snapshot-....json --apply --prune  # also remove tenants not in snapshot
```
Without `--apply` nothing is written - you see exactly what would change. `--prune` is opt-in and removes tenants that exist now but weren't in the snapshot.

## When to use
- Before running `POST /api/compliance/erase` or a bulk migration.
- Routine local/offsite backup on the json driver.
- **On postgres, use `pg_dump`/managed backups instead** - this utility targets the json phase.

## Verify
```bash
node tests/smoke/backupSmoke.js
```

## Note
Add `backups/` to your offsite copy / `.gitignore` as appropriate - snapshots contain tenant data (hashes are included as stored; treat as sensitive).
