# SENO Counter Setup

This document explains the test counter setup added for `play_test.html`.

## Added files

- `play_test.html`
- `functions/api/counter.js`
- `functions/api/visit.js`
- `functions/api/admin-stats.js`
- `admin/index.html`
- `schema.sql`
- `README_counter_setup.md`

## Why GitHub Pages alone is not enough

GitHub Pages can serve static HTML, CSS, JavaScript, and images, but it cannot run server-side API code or save records to a database. The GLOBAL counter needs a server-side API so the public page can record visits and confirmed plays without exposing database credentials in the browser.

## Why Cloudflare Pages Functions + D1

Cloudflare Pages Functions can run `/api/*` endpoints next to the static page. D1 provides a small SQL database for the visit and play records. Cloudflare also provides a country code through the request metadata, so the browser does not need to send country information.

## Stored data and privacy

The counter stores only:

- Event type: `visit` or `play`
- Country code from Cloudflare request metadata
- Play mode: `over` for play records
- Outcome: `win` or `draw` for play records
- Created time

The counter does not store IP addresses, device information, User-Agent strings, email addresses, names, or personal identifiers.

## Connect the GitHub repository to Cloudflare Pages

1. Open the Cloudflare dashboard.
2. Go to Workers & Pages.
3. Create a Pages project.
4. Connect the GitHub repository `akamo-dot/seno-game`.
5. Select the production branch only after the test page has been reviewed.
6. Keep the build command empty unless the project later adds a build step.
7. Set the output directory to the repository root.

## Create the D1 database

1. In Cloudflare, open Workers & Pages.
2. Go to D1 SQL Database.
3. Create a database for SENO counter data.
4. Keep the database name and ID for the binding step.

## Run `schema.sql`

1. Open the created D1 database.
2. Open the console or query screen.
3. Paste the contents of `schema.sql`.
4. Run it once.
5. Confirm that the `counter_events` table and indexes were created.

## Configure the D1 binding

1. Open the Cloudflare Pages project settings.
2. Go to Functions.
3. Add a D1 database binding.
4. Binding name: `SENO_DB`
5. Select the D1 database created for the SENO counter.
6. Save and redeploy the Pages project.

## Protect admin access

`admin/` and `/api/admin-stats` must be protected with Cloudflare Access before production use.

- URL secrecy is not admin protection.
- Only the owner account should be allowed to open `admin/`.
- Only the owner account should be allowed to call `/api/admin-stats`.
- Do not replace the production `/play` page until Access protection is confirmed.

## Test URL checks

On the test URL, confirm:

- `play_test.html` loads normally.
- GLOBAL / SCORE / RULES tabs switch correctly.
- `/api/visit` is called once per tab session.
- `/api/counter` GET returns the confirmed play total.
- WIN records send `{ "mode": "over", "outcome": "win" }`.
- DRAW records send `{ "mode": "over", "outcome": "draw" }`.
- API failure does not create fake counter increments.
- Admin stats show visits, plays, country totals, daily totals, outcomes, and recent plays.

## Before replacing production `play.html`

Confirm:

- Cloudflare Pages is serving the test page.
- D1 binding `SENO_DB` works.
- `schema.sql` has been applied.
- `admin/` is protected by Cloudflare Access.
- `/api/admin-stats` is protected by Cloudflare Access.
- The public GLOBAL counter shows real play totals only.
- Local preview or API failure does not increase the counter.

## Logs to check if something fails

- Cloudflare Pages deployment logs
- Cloudflare Pages Functions logs
- D1 query errors
- Browser console errors on `play_test.html`
- Network responses for `/api/visit`, `/api/counter`, and `/api/admin-stats`
