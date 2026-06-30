# Customer CSV Import / Export

Bulk-load and download customers - table stakes for a CRM (migrating in from a spreadsheet, exporting for analysis). Dependency-free CSV (handles quoted fields/commas), tenant-scoped, upsert by phone.

## Import
`POST /api/customers/import` (auth + admin). Body is raw CSV (`Content-Type: text/csv`) or JSON `{ csv: "..." }`.
Header row required; recognized columns: `phone` (required), `name`, `city`, `tier`, `tags` (`;`-separated), `status`, `promoOptIn`.
```
phone,name,city,tier,tags
923001234567,Ayesha,Karachi,Gold,vip;wholesale
```
Response: `{ total, created, updated, errors:[{row, error}] }`. Rows upsert by phone; a bad row is reported (with its line number) without failing the whole file.

## Export
`GET /api/customers/export.csv` (auth + admin) -> CSV attachment of all the tenant's customers.

## Safety
- Tenant-scoped via `lib/db` - you only ever import/export your own tenant.
- Per-row validation; missing phone is skipped + reported.
- Round-trips: export then re-import is idempotent (upsert by phone).

## Verify
```bash
node tests/smoke/customerCsvSmoke.js
```
