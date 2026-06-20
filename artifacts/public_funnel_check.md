# Public SaaS Funnel — Check Report

Generated: 2026-06-20T11:34:09.920Z
Result: ✅ PASS (21/21 checks passed)

## Checks
| Check | Status | Detail |
|---|---|---|
| landing_page_exists | ✅ |  |
| features_page_exists | ✅ |  |
| pricing_page_exists | ✅ |  |
| use_cases_page_exists | ✅ |  |
| start_page_exists | ✅ |  |
| leads_admin_page_exists | ✅ |  |
| route_module_requireable | ✅ |  |
| server_hook_present | ✅ |  |
| env_placeholders_present | ✅ |  |
| docs_present | ✅ |  |
| lead_store_works | ✅ |  |
| lead_pii_masked | ✅ |  |
| demo_request_works | ✅ |  |
| trial_request_works | ✅ |  |
| onboarding_preview_works | ✅ |  |
| consent_required | ✅ |  |
| no_raw_lead_export_default | ✅ |  |
| no_live_whatsapp_default | ✅ |  |
| no_live_email_default | ✅ |  |
| no_tenant_write_default | ✅ |  |
| dry_run_default | ✅ |  |

## Adapter status
| Adapter | Detected |
|---|---|
| saasBilling | yes |
| businessSetup | yes |
| customer360 | yes |
| compliance | yes |
| kpiCommand | yes |
| growthCampaign | yes |

## Safety posture
```json
{
  "enabled": true,
  "dryRun": true,
  "requireConsent": true,
  "allowTenantWrite": false,
  "allowCrmWrite": false,
  "allowLiveEmail": false,
  "allowLiveWhatsapp": false,
  "exportRawLeads": false,
  "capturePayment": false,
  "activateLicense": false
}
```