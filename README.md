# The Prism — School Publication & CMS

Live site: https://the-prism-publication.vercel.app/
Editor dashboard: https://the-prism-publication.vercel.app/admin.html

## Publication sections
- **Home** — featured articles, moving news ticker, article carousel, and photo gallery.
- **News** — news and feature stories.
- **Editorial** — written editorials and editorial cartoons.
- **Sports** — athletics and school sports stories.

## Manage articles without editing code

1. Open **/admin.html** in your browser or select the small **Admin Dashboard** link at the bottom of the website sidebar. Verify your GitHub fine-grained repository token to open the editor.
2. Select **+ New Article**, **+ New Cartoon**, or **+ Gallery Photo**, or choose an existing entry.
3. Fill in the title, author, publication date, summary, full story, photo, caption, and status. Select **Preview** to check the article.
4. Select **Save browser draft**. This only saves to your current browser; it is not yet public.
5. To publish, scroll to **Publish changes to Vercel**, select **Check repository**, then **Publish saved changes**. Your verified login token is reused only inside this editor tab. Once the Vercel production deployment becomes Ready, the website reads the updated content.

Repository defaults: `rcdex-hub/the-prism-publication`, branch `main`.
Only grant the token **Contents: Read and write** access to **this repository**. The token is **never saved in browser storage or project files**. Do not share it or enter it into untrusted websites.

The CMS now shows a **GitHub token verification gate** before rendering editor controls. It checks the authenticated GitHub user's repository write permission. **This is client-side gating, not a server-enforced login**; the static HTML and JavaScript remain public and can be bypassed in developer tools. Actual publication is protected by GitHub repository permissions and remains impossible without a valid write-scoped token. An OAuth/backend session system is needed for real server-side editor roles, school email authentication, and audit logs. The token is retained only in the current browser tab's DOM memory, never in local storage; refresh or sign-out requires signing in again.

The **Export backup** action downloads a local JSON backup. Uploaded JPG, PNG, or WEBP media (under 6 MB before compression) is stored in `site/assets/images/uploads/`, and the public image reference uses `assets/images/uploads/`.

### Workflow reminders
- Draft posts are hidden from the website until their status becomes Published **and** changes are committed.
- Each featured article marked **Highlight on homepage** is prioritized in the main news header.
- New Gallery entries update the homepage photo strip, with sample images used as fallback.
- If another editor changes `site/content/articles.json`, publishing stops with a conflict warning instead of silently overwriting their work. Reload the CMS and reconcile the changes before retrying.
- Only publish verified content with appropriate permissions for photographs of students.

## Technical structure

Static HTML/CSS/JS hosted on **Vercel**, output directory `site` (see `vercel.json`). Published records live in `site/content/articles.json`. The browser-based CMS uses the GitHub Contents API with a repository-scoped user-provided token for updates. Images are committed as separate files.

The PWA service worker excludes the CMS sign-in page and editor scripts from offline caching.

No database, payments, subscriptions, or public sign-up forms.
