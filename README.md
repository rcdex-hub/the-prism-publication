# The Prism — Server-protected CMS

Website: https://the-prism-publication.vercel.app/
Admin login: https://the-prism-publication.vercel.app/admin.html

## One-time GitHub OAuth setup

1. Visit https://github.com/settings/developers → OAuth Apps → New OAuth App.
2. Application name: The Prism CMS
3. Homepage URL: https://the-prism-publication.vercel.app
4. Authorization callback URL: https://the-prism-publication.vercel.app/api/callback
5. Register app, copy Client ID, and Generate a new client secret.
6. In Vercel → the-prism-publication → Settings → Environment Variables add GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET to Production. Treat the client secret as sensitive and never put it in the repository.
7. CMS_SESSION_SECRET is already generated and configured in production. Do not remove or reveal it.
8. Redeploy main to activate the new environment variables.
9. Open Admin Dashboard on the website → Sign in with GitHub, allow public_repo and read:user scopes. GitHub verifies identity, and Vercel checks actual push permission to rcdex-hub/the-prism-publication.

If OAuth is not configured, the CMS fails closed. The public publication pages remain available.

## Security and publishing

- Vercel functions under /api perform GitHub OAuth, check repository write permissions and handle image uploads and content commits.
- The editor dashboard HTML is served only after a verified server-side session; /admin.html is just the public login page.
- OAuth access tokens are encrypted into HttpOnly, Secure, host-only session cookies; they are never exposed to frontend JavaScript or local storage.
- OAuth state cookie protects callback; origin validation protects POST operations; the session expires after eight hours.
- The service worker does not cache private CMS pages or API responses.
- CMS public content JSON stores approved, published articles only after CMS publish.
- Browser-only drafts are still saved locally on the editor's device, not server-side. Do not use shared computers for private drafts.
- A GitHub OAuth App with public_repo permission can potentially access other public repositories of that account. A dedicated editor account with narrow repo membership is recommended.

## CMS editorial workflow

Sign in → create or edit articles → preview → save local draft → Publish saved changes.
Only GitHub users with push access to the publication repository can publish.
Vercel deploys website changes after GitHub commits to main.

The public website contains Home, News, Editorial and Sports. No payments or public signup.
