# White-Label QA

Branding QA reads the existing whiteLabelSettings preview read-only and asserts: brand name present, logo is a preview
URL (no upload), custom domain disabled by default (no DNS/SSL automation), powered-by stays visible unless white-label
is explicitly enabled, support contact masked, no secrets. Domain QA confirms custom domains are a manual checklist and
never auto-configured.

Nothing uploads files, configures DNS, issues SSL, or calls external services.
