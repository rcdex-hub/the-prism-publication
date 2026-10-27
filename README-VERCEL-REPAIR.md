# The Prism — Vercel repair package

This restores a complete static version of **The Prism**, Calbayog City National High School, while leaving the incomplete Vinext/Cloudflare files already in the GitHub repository untouched. It is a replacement static frontend, not a recovery of any missing Cloudflare D1/R2 application source or database content.

## What failed

The repository build script invokes `node scripts/run-framework.mjs build`, but the repository upload did not include the `scripts/` directory. Other framework/source folders are also absent, so the Next.js framework preset and dependency installation cannot publish the site as-is.

## Upload to the EXISTING repository

1. Extract the ZIP locally.
2. Go to https://github.com/rcdex-hub/the-prism-publication and open the **main** branch.
3. Choose **Add file → Upload files**. Drag BOTH items from the extracted package into the upload area: `vercel.json` and the entire `site/` folder. Also upload `README-VERCEL-REPAIR.md` if desired. Do not upload the `.zip` itself. The `site/` folder must preserve its subdirectories (`assets/images`, `content`).
4. Review the list for `vercel.json`, `site/index.html`, `site/admin.html`, and `site/content/articles.json`. Commit to `main`.
5. In Vercel, open your existing project `the-prism-publication`. A new Git deployment should start automatically. **Framework** and **install/build** overrides in `vercel.json` select the static `site` directory; Vercel should no longer execute the missing Vinext build script or install its deprecated dependencies.
6. Open the Vercel deployment URL, verify home/articles/admin, and install the PWA (browser menu) if supported.

## CMS

Open `/admin.html`. Local drafts do not update the website. To publish to GitHub, generate a fine-grained personal access token limited to this repository with **Contents: Read and write**. The CMS must target owner `rcdex-hub`, repository `the-prism-publication`, branch `main`, and path `site/content/articles.json` (already configured in `assets/admin.js`). Images commit to `site/assets/images/uploads/`. The browser holds the token in memory only; never enter it on someone else's device.

The admin page itself is public and is **not a private sign-in system**; GitHub authentication is what protects publishing. There is no D1/R2 database in this edition. All example articles are placeholders; verify dates/photos before publishing as news.

## If you need the original Vinext / Cloudflare CMS

Recover the original project export and upload all directories referenced by `vite.config.ts` and `package.json`, including `scripts/`, `app/` (or `src/app/`), `worker/`, and `.openai/`, plus backend/storage configuration. The root config files alone cannot build the original app. Once complete, configure a compatible deployment target; the current starter is designed around Cloudflare Workers, not automatically deployable as a conventional Next.js Vercel app.
