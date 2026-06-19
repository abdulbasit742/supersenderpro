# Subscription OAuth Vault

SuperSender Pro can let customers connect OAuth-capable subscription or identity accounts through a server-side OAuth 2.0 flow.

## What This Feature Does

- Shows provider setup and connect buttons at `/subscription-oauth`.
- Provides API diagnostics at `/api/subscription-oauth/status`.
- Stores connected accounts in `data/subscription_oauth_accounts.json`.
- Masks access, refresh, and ID tokens in every public API response.
- Supports WhatsApp admin commands:
  - `!suboauth`
  - `!connectsub google`
  - `!connectsub github`
  - `!connectsub custom`
- Sends a connect link to customers when they ask to connect a subscription account.

## Provider Redirect URLs

Add these callback URLs inside the OAuth app/provider dashboard:

```text
http://localhost:3001/api/subscription-oauth/callback/google
http://localhost:3001/api/subscription-oauth/callback/github
http://localhost:3001/api/subscription-oauth/callback/custom
```

For production, replace `http://localhost:3001` with your public domain:

```text
https://app.pakentrepreneur.me/api/subscription-oauth/callback/google
https://app.pakentrepreneur.me/api/subscription-oauth/callback/github
https://app.pakentrepreneur.me/api/subscription-oauth/callback/custom
```

## Environment Variables

```env
SUBSCRIPTION_OAUTH_ENABLED=true
SUBSCRIPTION_OAUTH_PUBLIC_BASE_URL=https://app.pakentrepreneur.me
SUBSCRIPTION_OAUTH_PROVIDER_SLUG=custom
SUBSCRIPTION_OAUTH_PROVIDER_LABEL=Custom Subscription Provider
SUBSCRIPTION_OAUTH_CLIENT_ID=
SUBSCRIPTION_OAUTH_CLIENT_SECRET=
SUBSCRIPTION_OAUTH_AUTH_URL=
SUBSCRIPTION_OAUTH_TOKEN_URL=
SUBSCRIPTION_OAUTH_USERINFO_URL=
SUBSCRIPTION_OAUTH_SCOPES=openid profile email
SUBSCRIPTION_OAUTH_PROVIDERS_JSON=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
```

`SUBSCRIPTION_OAUTH_PROVIDERS_JSON` can contain an array of provider configs:

```json
[
  {
    "slug": "example",
    "label": "Example Provider",
    "authUrl": "https://example.com/oauth/authorize",
    "tokenUrl": "https://example.com/oauth/token",
    "userInfoUrl": "https://example.com/oauth/userinfo",
    "clientId": "client_id_here",
    "clientSecret": "client_secret_here",
    "scopes": "openid profile email"
  }
]
```

## Important Notes

- This does not bypass any provider policy. The provider must support official OAuth.
- Personal subscription services that do not expose OAuth cannot be connected automatically.
- Runtime token files must not be committed to GitHub.
