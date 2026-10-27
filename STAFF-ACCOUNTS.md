# Staff accounts

Sign in as an Administrator, open **Staff accounts** in the dashboard sidebar, and enter a unique username, staff email, password, and role. Select **Add staff account**. The new staff member can sign in with that username, password, and assigned role.

- **Editor** creates and previews browser drafts.
- **Administrator** also manages staff accounts and publishes when the site's publishing integration is configured.

Supabase Auth stores the password. The private `prism_cms_staff` table stores the username, role, and access status. Password requirements come from the Supabase project. Existing usernames and Auth email addresses cannot be reused through this form.

Only administrators may list or add staff through `/api/staff`; the API rechecks the current account's database-assigned role. Staff management uses the existing server-only Supabase configuration. No new environment variables or database policies are required.

Verification: `node --test tests/staff.test.mjs`.
