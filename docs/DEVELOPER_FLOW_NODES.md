# Developer Flow Nodes

If Flow Studio exists, register entries from `lib/developerPortal/flowNodes.js`.

Triggers: `developer_portal.app_created`, `developer_portal.webhook_subscription_created`,
`developer_portal.webhook_delivery_blocked`, `developer_portal.webhook_delivery_simulated`.

Actions: `create_developer_app_preview`, `create_webhook_subscription_preview`,
`send_webhook_test_preview`, `generate_api_docs`, `create_developer_notification`.

No live external execution.
