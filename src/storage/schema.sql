-- one row per (tenant, store-file-equivalent); doc holds the same JSON the
-- modules already read/write. JSONB = indexable, atomic upserts, concurrent-safe.
CREATE TABLE IF NOT EXISTS ss_store (
tenant_id    TEXT NOT NULL,
name         TEXT NOT NULL,
doc          JSONB NOT NULL DEFAULT '{}'::jsonb,
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
PRIMARY KEY (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS ss_store_tenant_idx ON ss_store (tenant_id);
-- tenant registry (mirrors data/_tenants.json)
CREATE TABLE IF NOT EXISTS ss_tenant (
id           TEXT PRIMARY KEY,
name         TEXT NOT NULL,
plan         TEXT NOT NULL DEFAULT 'starter',
status       TEXT NOT NULL DEFAULT 'active',
settings     JSONB NOT NULL DEFAULT '{}'::jsonb,
channels     JSONB NOT NULL DEFAULT '[]'::jsonb,
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
