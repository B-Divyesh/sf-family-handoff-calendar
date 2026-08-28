# Independent verification 1 — FAIL

**Candidate:** `578df1125e2f8f31593f852b33254ecba50782ba`
**Live URL:** <https://family-handoff-calendar.sociobot.in>
**Verified:** 2026-08-28 UTC
**Result:** **FAIL**

The core local-first calendar is functional and the live static files byte-match
the candidate build. The release nevertheless fails the product contract because
the advertised paid checkout is unavailable, the product's license endpoint does
not rate-limit a rapid burst, and the deployed host does not provide immutable
caching for hashed assets.

## Blocking defects

### High — advertised household-pass checkout is broken

`GET https://pilot-api.sociobot.in/api/v1/products/family-handoff-calendar/checkout`
returned **HTTP 404** on 2026-08-28. The live bundle matches the candidate and
uses this pilot API as its default billing base. Thus the visible “Buy household
pass” link cannot begin checkout. Invalid-license verification itself is CORS
enabled and returns the expected `200 {"valid":false,"reason":"invalid"}`;
the defect is specifically checkout registration/release configuration.

### High — required API rate limiting absent

An 80-request burst to
`GET https://pilot-api.sociobot.in/api/v1/products/family-handoff-calendar/verify?license=qa-invalid-token-<n>`
was issued at concurrency 40 over approximately 4.5 seconds. Results: **80 ×
HTTP 200**, **0 × HTTP 429**, and **no `Retry-After` header**. No threshold was
observed through 80 requests. This fails the explicit rate-limit acceptance
requirement for the product-unlock endpoint.

### Medium — deployed hashed assets are not immutably cached

The live root, JS, CSS, images, worker, manifest, and legal pages all return
`Cache-Control: public, must-revalidate, max-age=30`. In particular, the
content-hashed `/assets/index-DdyQWpf4.js` and `/assets/index-DgOZAI8D.css`
should have long-lived immutable caching. The service worker mitigates repeat
loads after it controls a tab, but this still fails the stated static/PWA host
caching requirement.

### Low — browser hardening policy is incomplete

The live HTML response provides HSTS, `Referrer-Policy:
strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`, but no
`Content-Security-Policy`, `Permissions-Policy`, or frame-ancestor/X-Frame-
Options protection was present. This is not the reason for the fail above, but
should be addressed in deployment policy.

## Passing evidence

### Clean local quality gates

Clean checkout was already at the specified candidate before installation.

| Command | Result |
| --- | --- |
| `npm ci` | Installed 57 packages; audit reported 0 vulnerabilities. |
| `npm test` | PASS — 7/7 Vitest ICS/date/recurrence tests. |
| `npm run build` | PASS — `tsc --noEmit` and Vite production build; `dist/` produced. |
| `npm run test:e2e` | PASS — 4/4 Chromium tests (persistence, axe, offline reload, 390px layout). |
| `npm run check` | PASS — repeated all three checks above. |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities. |

No lint script is defined in `package.json`; the available type check runs as
part of `npm run build`.

Production output is within the static/PWA size budgets: JS is 30,628 bytes
(10,960 gzip), CSS 17,645 bytes (5,060 gzip), and the largest hero WebP is
49,720 bytes. There are no runtime font downloads. A Lighthouse CLI run was
attempted, but the isolated browser could not be connected by the CLI; no
Lighthouse score is claimed in this report.

### Independent end-to-end exercise

Using the built production app in a fresh Chromium profile:

- Added Alex and Sam; created a handoff, assigned From/To, and verified saved
  state and portable ICS export (including the custom handoff ownership fields).
- Rejected end-before-start and equal start/end values with the visible,
  focus-directed message “End time must be after the start time.” Recovery with
  a one-minute duration saved successfully.
- Imported an ICS containing one valid pickup plus one malformed event with no
  DTSTART; the app retained the valid event and reported “1 event imported; 1
  skipped.” An invalid JSON backup reported “That backup is missing members or
  events.”
- Confirmed application data is stored in IndexedDB database
  `family-handoff-calendar`; a normal calendar session had empty localStorage
  and no first-party cookies. Source and network review found no analytics,
  third-party fonts/scripts, geolocation, tracking, accounts, or calendar
  upload. The only remote application call is the optional Sociobot license
  verifier, made only when a license token exists.

### Accessibility, responsive, and PWA checks

- Live desktop: exactly one h1, `lang=en`, title, main landmark, semantic skip
  link, and no console or page errors. Tab first reaches “Skip to handoff
  board”; Enter opens the add dialog; Escape returns focus to “+ Add handoff”.
- `axe-core` against the live app found **0 serious/critical** violations.
- Live 390×844 viewport had `scrollWidth=390` and `clientWidth=390` (no
  horizontal overflow). With reduced motion enabled, primary-control transition
  duration was `1e-06s`.
- The live browser made requests only to
  `https://family-handoff-calendar.sociobot.in` during normal use, with no
  console/page errors.
- On a clean live context, waited for a controlling service worker, set the
  context offline, and reloaded successfully; both “Know who’s next.” and the
  offline notice remained available.
- Service-worker update was tested against an in-memory temporary server serving
  the unmodified production `dist/` files. A changed worker version entered
  `waiting`, showed “A fresh version is ready. Update now”, and activated after
  that action. The updated shell also reloaded offline. No product source or
  candidate artifact was edited for this test.

### Live/candidate identity and headers

SHA-256 comparisons showed exact live/build matches for `/`, the hashed JS and
CSS, `/sw.js`, manifest, offline page, privacy and terms pages, 192px icon, and
hero WebP. This is fresh evidence that the defects above are present in the
actual candidate deployment, not a stale deployment.

The manifest is discovered by Chromium without errors. HTTPS/HSTS and the
service worker scope are operational. Response MIME for the manifest is
`application/octet-stream` rather than `application/manifest+json`; Chromium
reported no manifest errors, but the host should serve the conventional manifest
MIME while its header policy is being corrected.

## Required next steps

1. Register/configure the production or pilot product so the checkout URL used
   by the live bundle returns a hosted checkout rather than 404; retest with a
   non-purchasing redirect check.
2. Add a rate limiter to the verification API that returns 429 plus
   `Retry-After`; rerun the burst and record the observed threshold.
3. Configure immutable, long-lived caching for hashed `/assets/*` and a
   no-cache/revalidation policy appropriate for `sw.js`; add CSP,
   Permissions-Policy, and frame-ancestor protection at the host.
4. Re-run independent verification after deployment changes. Core product
   functionality does not need a code rewrite based on this verification.
