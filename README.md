# The Prism — School Publication & CMS

Live site: https://the-prism-publication.vercel.app/
Editor dashboard: https://the-prism-publication.vercel.app/admin.html

## Publication sections
- **Home** — featured articles, moving news ticker, article carousel, and photo gallery.
- **News** — news and feature stories.
- **Editorial** — written editorials and editorial cartoons.
- **Sports** — athletics and school sports stories.

## Manage articles without editing code

1. Open **/admin.html** in your browser.
2. Select **+ New Article**, **+ New Cartoon**, or **+ Gallery Photo**, or choose an existing entry.
3. Fill in the title, author, publication date, summary, full story, photo, caption, and status. Select **Preview** to check the article.
4. Select **Save browser draft**. This only saves to your current browser; it is not yet public.
5. To publish, scroll to **Publish changes to Vercel**, enter a GitHub fine-grained personal access token, select **Check repository**, then **Publish saved changes**. Once the Vercel production deployment becomes Ready, the website reads the updated content.

Repository defaults: `rcdex-hub/the-prism-publication`, branch `main`.
Only grant the token **Contents: Read and write** access to **this repository**. The token is **never saved in browser storage or project files**. Do not share it or enter it into untrusted websites.

The CMS page itself is not password-protected; **publishing** is protected by GitHub authorization. Anyone who opens the CMS can edit drafts in their own browser, but they cannot commit without a token with repository write access. A separate identity system is needed for school-wide roles and logins.

The **Export backup** action downloads a local JSON backup. Uploaded JPG, PNG, or WEBP media (under 6 MB before compression) is stored in `site/assets/images/uploads/`, and the public image reference uses `assets/images/uploads/`.

### Workflow reminders
- Draft posts are hidden from the website until their status becomes Published **and** changes are committed.
- Each featured article marked **Highlight on homepage** is prioritized in the main news header.
- New Gallery entries update the homepage photo strip, with sample images used as fallback.
- If another editor changes `site/content/articles.json`, publishing stops with a conflict warning instead of silently overwriting their work. Reload the CMS and reconcile the changes before retrying.
- Only publish verified content with appropriate permissions for photographs of students.

## Technical structure

Static HTML/CSS/JS hosted on **Vercel**, output directory `site` (see `vercel.json`). Published records live in `site/content/articles.json`. The browser-based CMS uses the GitHub Contents API with a repository-scoped user-provided token for updates. Images are committed as separate files.

No database, payments, subscriptions, or public sign-up forms.
