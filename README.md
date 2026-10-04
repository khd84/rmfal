# RMFAL website — Hostinger migration

The existing public website has been recovered as editable HTML, CSS, JavaScript, images and fonts, with an Express server for hosting and replacement contact/newsletter email endpoints. Arabic is the default language. The original English version is available at `/en/`.

## Owner review preview

Public preview: https://khd84.github.io/rmfal/

Source repository: https://github.com/khd84/rmfal

GitHub Pages serves the generated `gh-pages` branch. This is a static review copy: forms display a preview-only message and do not send data. The Node.js version on `main` is the full Hostinger deployment. The preview requests no search indexing; it remains publicly accessible to anyone with the URL.

To update the preview, run `node scripts/preview.mjs` and publish the contents of `dist/pages/` to `gh-pages`. The script applies the `/rmfal/` URL prefix without changing the production files.

## Run locally

Install Node.js 22 or 24, then:

```sh
npm ci
npm start
```

Open http://localhost:3000. `npm run dev` restarts the server when code changes. Run `npm run build` to validate all page and asset references, and `npm test` to test routes and form handling.

## Deploy on Hostinger

Use a plan that explicitly includes **Node.js web apps with Express backend support**. Hostinger currently lists Business Web Hosting and Cloud plans; confirm support when purchasing. Ordinary PHP/static hosting does not run these email endpoints.

1. In hPanel, choose Websites → Create Website → Web App → Upload your website files (or import a Git repository).
2. Upload `dist/rmfal-hostinger.zip`. The ZIP contains the app at its root, with no `node_modules` or secrets.
3. Choose **Express**, Node.js **24** (22 also works), install command `npm ci`, build command `npm run build`, start command `npm start`, and entry file `server.js`. If asked for the static directory, use `public`; keep this an Express backend deployment.
4. Add the environment variables from `.env.example` in hPanel. Hostinger supplies `PORT`; the server listens on `0.0.0.0`.
5. Preview the temporary Hostinger domain. Check Arabic and English pages, images, menu, phone/WhatsApp links and forms.
6. Create or connect the new `info@rmfal.com` mailbox and configure SMTP. Send a real test message and verify it reaches the inbox before switching DNS.
7. Connect `rmfal.com` using Hostinger's displayed DNS records and enable HTTPS. Preserve existing mail MX/TXT records unless deliberately migrating email too. Domain/DNS access is required independently of old hosting access.

Official deployment reference: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

## Email configuration

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and `CONTACT_TO` using the new mailbox provider's actual settings. Never put SMTP credentials in `public/` or commit `.env`. For local use, copy `.env.example` to `.env` and fill it in.

- Contact forms send to `CONTACT_TO`; the visitor address is Reply-To.
- Newsletter forms send a subscription request to that inbox. They do not implement automated campaigns or recreate the old subscriber database.
- Missing SMTP or failed delivery produces a clear error, never a false success.
- No submissions are saved to the application's filesystem or logged. Validation, a honeypot, origin checks, request-size limits and per-process rate limits are included.
- Behind a proxy, set `TRUST_PROXY_HOPS` only to the verified number of trusted proxy hops. The default is 0; behind a proxy this conservatively shares a rate-limit bucket. Multi-instance deployments should use a shared limiter before scaling.

## What was preserved

- 18 Arabic pages: homepage, about, service index, 11 service detail pages, team index, two partner profiles and contact page.
- 14 English pages exposed by the original site's English navigation. The original English content differs from Arabic; it is preserved as published, not newly translated.
- Original photos, logos, local fonts, colors, typography and layouts.
- Existing URL paths, contact details, map, phone and WhatsApp links.
- Mobile menu, responsive layouts, and original animations, with focused fixes for overflow, labels and keyboard navigation.

`archive/pages/` contains the unmodified public HTML for reference. `archive/manifest*.json` records capture dates, source URLs and download failures. These archives are not publicly served or included in the deployment ZIP.

Several decorative assets referenced by unused template CSS already returned 404 on the old host. The final CSS uses existing equivalent decorative images where available and removes dead references. The hero had a nonexistent video ID (`#`); its original photograph is retained without the broken video initializer. Footer navigation links have been repaired. Social links on the source were placeholders (`#`) and still need actual profile URLs if desired.

## Editing

- Pages: `public/index.html`, `public/about/index.html`, `public/service/…/index.html`, etc.
- English: `public/en/`.
- Original styles and assets: `public/assets/`.
- Responsive/accessibility adjustments: `public/migration.css`.
- Form and menu enhancements: `public/migration.js`.
- Backend: `server.js`.

No database, PHP runtime, old-host access or build-time access to rmfal.com is required. Google Maps remains an external embed; phone, mail and WhatsApp links intentionally open their respective services.

The public recovery cannot recover the old admin panel, server-side source, database, past inquiries, subscribers, mailbox contents or private files. This is a standalone rehosting of the public site, not a backup of the inaccessible server.

## Re-capture (optional; overwrites public page files)

`node scripts/mirror.mjs` captures Arabic; `node scripts/mirror.mjs --en` captures English. Only use these intentionally before local content edits. Run `node scripts/finalize.mjs` afterward, then validate and inspect. Existing downloaded assets are reused. Normal builds never crawl the source site.

## Packaging

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force dist | Out-Null
Compress-Archive -Path public,scripts,test,server.js,package.json,package-lock.json,.env.example,README.md -DestinationPath dist/rmfal-hostinger.zip -Force
```

Do not upload `.env`, `node_modules`, test screenshots or the `archive` folder.
