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
- `wrangler.toml`

## Why GitHub Pages alone is not enough

GitHub Pages can serve static HTML, CSS, JavaScript, and images, but it cannot run server-side API code or save records to a database. The GLOBAL counter needs a server-side API so the public page can record visits and confirmed plays without exposing database credentials in the browser.

## Why Cloudflare Pages Functions + D1

Cloudflare Pages Functions can run `/api/*` endpoints next to the static page. D1 provides a small SQL database for the visit and play records. Cloudflare also provides a country code through the request metadata, so the browser does not need to send country information.

The test page should be reviewed on Cloudflare Pages, not GitHub Pages, when API behavior matters. GitHub Pages can still show the static page, but `/api/visit`, `/api/counter`, `/api/admin-stats`, and database writes will not run there.

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
5. Select the branch that contains `play_test.html` while testing.
6. Keep the build command empty unless the project later adds a build step.
7. Set the output directory to the repository root (`.`).
8. Confirm that the `functions/api/` directory is detected by Cloudflare Pages Functions.
9. Do not replace production `play.html` until the test URL has passed the checks below.

## Optional Wrangler config

`wrangler.toml` is included as a deployment reference:

- Project name: `seno-game`
- Output directory: `.`
- D1 binding name: `SENO_DB`
- D1 database name placeholder: `seno-counter`
- D1 database ID placeholder: `REPLACE_WITH_D1_DATABASE_ID`

Before using Wrangler for deployment, replace the database ID placeholder with the actual D1 database ID. Do not commit secrets, admin passcodes, or account tokens.

## Create the D1 database

1. In Cloudflare, open Workers & Pages.
2. Go to D1 SQL Database.
3. Create a database for SENO counter data, for example `seno-counter`.
4. Copy the database ID for the binding step and for `wrangler.toml` if Wrangler is used.

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
6. Save the binding.
7. Redeploy the Pages project.
8. Check the Functions logs if `/api/counter` returns `D1 binding SENO_DB is not configured`.

## Configure the admin token

Cloudflare Access is not required for the current simple admin setup. Instead, `/api/admin-stats` requires a Bearer token from the environment variable `ADMIN_TOKEN`.

The `admin/` page itself can be public, but it cannot load real stats unless the correct admin passcode is entered. The browser sends it as:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

Important:

- Use a long random value for `ADMIN_TOKEN`.
- Do not commit `ADMIN_TOKEN` to GitHub.
- Do not put `ADMIN_TOKEN` in `wrangler.toml`.
- The admin page stores the passcode only in `sessionStorage`, so it is kept for the current browser tab session.
- If `ADMIN_TOKEN` is missing, `/api/admin-stats` returns a configuration error and does not return stats.
- If the token is missing or wrong, `/api/admin-stats` returns `401` and does not return stats.

Set `ADMIN_TOKEN` in Cloudflare Pages:

1. Open the Cloudflare Pages project.
2. Go to Settings.
3. Open Environment variables.
4. Add a production variable named `ADMIN_TOKEN`.
5. Enter a long random passcode value.
6. Save and redeploy the Pages project.

If you use Wrangler, set the secret with Cloudflare's secret command for the Pages project instead of committing it to the repository. Confirm the value is available to Pages Functions as `context.env.ADMIN_TOKEN`.

Cloudflare Access can still be added later as an extra layer, but it is optional for this setup.

## Test URL checks

On the test URL, confirm:

- `play_test.html` loads normally.
- GLOBAL / SCORE / RULES tabs switch correctly.
- `/api/visit` is called once per tab session.
- `/api/counter` GET returns the confirmed play total, not visits.
- WIN records send `{ "mode": "over", "outcome": "win" }`.
- DRAW records send `{ "mode": "over", "outcome": "draw" }`.
- API failure does not create fake counter increments.
- Admin stats show visits, plays, country totals, daily totals, outcomes, and recent plays.
- Opening `admin/` shows the private stats shell and asks for the admin passcode.
- Calling `/api/admin-stats` without `Authorization: Bearer <ADMIN_TOKEN>` returns `401`.
- Entering the correct passcode in `admin/` loads the private stats.

## Before replacing production `play.html`

Confirm:

- Cloudflare Pages is serving the test page.
- D1 binding `SENO_DB` works.
- Environment variable `ADMIN_TOKEN` is set in Cloudflare Pages.
- `schema.sql` has been applied.
- `/api/admin-stats` rejects requests without the Bearer token.
- `admin/` loads stats only after the correct passcode is entered.
- The public GLOBAL counter shows real play totals only.
- Local preview or API failure does not increase the counter.
- Visit records and play records appear in D1.
- Country codes are populated from Cloudflare request metadata.
- No IP addresses, User-Agent strings, names, emails, or personal identifiers are stored.
- SCORE win/draw registration still works on mobile and desktop.

## Logs to check if something fails

- Cloudflare Pages deployment logs
- Cloudflare Pages Functions logs
- D1 query errors
- Browser console errors on `play_test.html`
- Network responses for `/api/visit`, `/api/counter`, and `/api/admin-stats`
