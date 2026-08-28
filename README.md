# Family Handoff Calendar

A private, offline-first responsibility board for households coordinating pickups, drop-offs, activities, and person-to-person handoffs. It answers “who is responsible next?” without requiring a Google/Apple account, a family profile, or a hosted calendar.

Live product: <https://family-handoff-calendar.sociobot.in>

## What v1 does

- Keeps named household members and schedule data in browser IndexedDB.
- Shows owned and unassigned stops across the next 48 hours.
- Adds, edits, and deletes pickups, drop-offs, activities, and handoffs.
- Imports ICS with UTC, floating local, IANA timezone, date-only, daily recurrence, and weekly recurrence handling.
- Exports portable ICS plus a complete JSON device backup.
- Produces a seven-day, ink-friendly printable responsibility sheet.
- Installs as a PWA and reloads the app shell and saved data offline.
- Offers an optional $12 one-time household pass for more than two members. Core calendar use, printing, and exports stay free.

There are intentionally no accounts, messages, location tracking, school integrations, analytics, third-party scripts, or remote calendar hosting.

## Develop

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Calendar data created there stays in that browser profile.

## Test and build

```sh
npm test          # ICS/date unit tests
npm run build     # exact production build command; output is ./dist
npm run test:e2e  # Chromium UI, axe, mobile, persistence, and offline checks
npm run check     # all of the above
```

Playwright is pinned to 1.58.2. If its Chromium binary is not already available, run `npx playwright install chromium`.

Preview the production output with `npm run preview`. A static deployment must serve `dist/index.html` at `/`; `/privacy/` and `/terms/` are emitted as static documents. Configure long-lived immutable caching for `/assets/` at the host; `sw.js` uses its own versioned cache.

## Calendar and privacy notes

ICS imports recognize `CATEGORIES:PICKUP`, `DROPOFF`, and `HANDOFF`, plus the portable `X-FAMILY-HANDOFF-*` fields emitted by this app. Generic imports remain activities until edited. Daily and weekly `RRULE`s are expanded into editable occurrences; unsupported recurrence types retain the first occurrence and produce a visible import warning. Custom `VTIMEZONE` definitions and recurrence exceptions are not interpreted in v1, so keep the source calendar as a backup and check unusual schedules after import.

JSON restore replaces local data only after a confirmation. ICS import merges by UID. Exported files can contain sensitive schedule/location details and are never uploaded by the app.

The optional license flow uses the Sociobot billing API only. Set `VITE_BILLING_BASE` at build time to select another registered environment; the default is `https://api.sociobot.in`. Product IDs and payment-provider credentials are not stored here.

## Project notes

- Product brief: [`.factory/brief.json`](.factory/brief.json)
- Visual system and generated-art provenance: [`.factory/design.md`](.factory/design.md)
- Delivery report: [`.factory/handoff.md`](.factory/handoff.md)
- License: [MIT](LICENSE)
