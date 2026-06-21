 # Offline Provider Simulators

 Each provider exports `getStatus()`, `runPreview(input)`, `getSampleScenarios()`, `validateInput(input)` and returns a
 standard mock response (ok, provider, action, status, dryRun, offlineOnly, liveActionsEnabled, requestPreview,
 responsePreview, warnings, blockers, timestamp).


 ## Providers
 whatsappBaileysMock, whatsappCloudMock, channelPublisherMock, socialPublisherMock, ecommerceMock, paymentVerifierMock,
 webhookDeliveryMock, aiProviderMock, voiceAIMock, emailMock, billingMock, tenantMock, supportMock, developerPortalMock,
 auditSecurityMock.

None send messages, verify real payments, deliver webhooks, or call external APIs. All output is redacted.
