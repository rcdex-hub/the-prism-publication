# The Prism

School publication website for Calbayog City National High School. Green and gray, Poppins typography, responsive layouts, and the supplied publication emblem.

## Manage the publication

Open **Publication CMS** at `/admin` while signed in as the site owner. The first authenticated CMS visit on the initially private site binds that account as editor. Other accounts do not receive edit access if site viewing is later shared. Open the CMS as owner before changing audience.

- **Add article**: title, author, date, category, introduction, image, caption, full story.
- **Add cartoon**: title, artist, date, image, short message and explanation.
- Save as **Draft** to keep content in the CMS or **Published** to display it on the website.
- Use the pencil to edit and the trash button to delete. A confirmation appears before deletion.
- Upload JPG, PNG or WebP images up to 5 MB. Content uses D1 storage; uploads use R2.

All initial articles and illustrations are labeled placeholder content. The first story image and masthead emblem display portions of the supplied publication reference; replace the story photograph before real reporting is published. No payment, subscription or contact forms are included.

## Development

This project uses the Sites Vinext starter. Preserve its Sites Vite integration and platform-owned sign-in routes.

`npm run dev` starts local preview. Portable local sign-in uses `seedy@sites.test`; this mock sign-in is excluded from production. `npm run build` creates the production Worker. `npm run db:generate` creates schema migrations. Apply new local migrations using Wrangler as described in the Sites skill. Production migrations are applied by Sites during deployment.

The source manifest is `.openai/hosting.json`, with `DB` and `BUCKET` bindings. Do not put secrets or database contents in source. The Sites helper manages source synchronization, packaging and publication.
