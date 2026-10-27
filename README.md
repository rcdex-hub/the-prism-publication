# The Prism — Supabase CMS Admin Login

Public site: https://the-prism-publication.vercel.app/
Admin login: https://the-prism-publication.vercel.app/admin.html

## New login interface

The login screen includes **Username, Password, Role (Administrator or Editor)**.
Passwords are verified through **Supabase Auth**, not stored in the website or in Postgres user profile rows.
Supabase staff records link the authenticated user ID to a username, a database-controlled role and active status.
The selected role must match the assigned database role; choosing Administrator in the form never grants administrator rights.
The backend rechecks assigned role and active status on each protected request.

**Administrator** may create/edit local articles, upload and publish approved content.
**Editor** may create and preview browser-local drafts and read published articles; the server rejects editor uploads and publication.

## One-time Supabase setup (choose a project dedicated to The Prism)

1. Create or select a Supabase project at https://supabase.com/dashboard. Do not reuse another application's staff database unless explicitly intended.
2. In Supabase SQL Editor, run `supabase/prism_cms_staff.sql` from this repository.
3. In Supabase → Authentication → Users, add an email/password user; confirm their email as required.
4. Insert the Auth user's UUID, lowercase username, and assigned `admin` role in `public.prism_cms_staff` using the sample SQL comments.
5. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to the Vercel production environment.
   - `SUPABASE_URL`: https://YOUR_PROJECT_REF.supabase.co
   - `SUPABASE_ANON_KEY`: the Supabase **publishable key** (`sb_publishable_...`) or legacy anon JWT.
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase **secret key** (`sb_secret_...`) or legacy service_role JWT. Select Secret/Sensitive in Vercel and NEVER expose it to browser code or GitHub.
6. To let Supabase Administrators publish to GitHub, set Vercel `CMS_GITHUB_TOKEN` to a fine-grained personal access token limited to `rcdex-hub/the-prism-publication` with Contents: Read and write. Keep it in Vercel Secret/Sensitive storage, never in the browser or Git repository.
7. Redeploy the current main branch in Vercel to activate the new production variables.
8. Open `/admin.html`; enter the username, Auth password, and matching role, then select Sign In.

Until the Supabase variables are configured, Supabase login fails closed with a configuration message. Existing GitHub OAuth sign-in remains available as an interim backup.
Without `CMS_GITHUB_TOKEN`, the Supabase CMS can load public articles and save local drafts but **cannot publish**.

## Security and storage

- Sessions are encrypted and signed using AES-256-GCM, set in Secure HttpOnly host-only cookies, and expire after 8 hours.
- Every authenticated server request verifies the current staff role and `active` flag in Supabase.
- Vercel API checks role-based permissions for publishing; it never trusts the role selected by the browser.
- Supabase service/secret and GitHub publishing credentials are used on the server only.
- Supabase Auth password grant and its rate limits handle password verification.
- `public.prism_cms_staff` has row-level security enabled with no anonymous or authenticated policies.
- Approved articles remain versioned in GitHub and served as JSON by the static website.
- Drafts in the current CMS remain **browser-local** rather than in a shared online Supabase database. Do not use shared computers for private drafts.
- Existing GitHub OAuth authentication can be disabled in a later update after Supabase login and publishing are verified.

No payment features or public sign-up forms.
