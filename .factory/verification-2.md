# Independent verification 2 — FAIL

**Candidate:** `bbee668d3413d53f5f3bae41b3e9ef5de301bd75`

**Live URL:** <https://family-handoff-calendar.sociobot.in>

**Verified:** 2026-08-28 UTC

**Result:** **FAIL**

The core local-first calendar, production build, live deployment, checkout,
rate limiting, privacy posture, and offline/update behavior all pass. The full
acceptance contract nevertheless fails because several persistent mobile links
do not meet the explicitly required 44×44 CSS-pixel target minimum.

## Defects

### Medium — persistent mobile links have undersized touch targets

At a 390×844 Chromium viewport, bounding rectangles were:

| Target | Measured size |
| --- | ---: |
| Header brand/home link | 225×36 px |
| Household-panel Privacy link | 58×19 px |
| Household-panel Terms link | 47×19 px |
| Footer Privacy link | 47×15 px |
| Footer Terms link | 39×15 px |
| Focused skip link | 228×43 px |

The hidden file input was excluded from this finding. Primary buttons and form
controls met the minimum. The undersized persistent links make touch misses
more likely and violate the attached accessibility/design acceptance rule that
every touch/click target be at least 44×44 px. Add an adequate minimum block
size or padding without reducing the existing spacing, then remeasure at 390 px.

### Low — README names the wrong default billing environment

`README.md` says the default `VITE_BILLING_BASE` is the factory pilot endpoint,
while the candidate source, built bundle, live application, and release-policy
test correctly use `https://api.sociobot.in`. This can mislead a maintainer
diagnosing checkout or making a staging build.

## Prior release blockers retested from fresh evidence

All three material defects from independent verification 1 are repaired:

- Checkout returned HTTP 303 to a hosted
  `https://checkout.dodopayments.com/session/...` URL. No purchase was made.
- The live verification API now rate-limits. An 80-request burst at concurrency
  40 completed in 664 ms with **30× HTTP 200 and 50× HTTP 429**. Every 429
  carried `Retry-After: 4`; the observed full-burst admission threshold was 30
  requests. A follow-up against a partially replenished bucket admitted 3
  requests and returned 429 on request 4 with `Retry-After: 1`.
- Live cache and browser policies now match the repository configuration:
  root `no-cache`; hashed assets `public, max-age=31536000, immutable`; worker
  `no-cache, no-store, must-revalidate`; manifest `no-cache` and
  `application/manifest+json`; restrictive CSP and Permissions-Policy;
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict referrer
  policy, and HSTS.

The invalid-license API response was HTTP 200 with body
`{"expires_at":null,"reason":"invalid","valid":false}` and header
`Cache-Control: no-store`, and allowed the live origin through CORS. A returned license token
was saved under `sb_license:family-handoff-calendar`, stripped from the browser
URL, and verified once. A fresh cached verdict caused zero verify calls on
reload; a verdict older than one day caused one call.

## Clean checkout and repository gates

The worktree was clean and `HEAD` was the requested candidate before install.
Node was v22.23.2 and npm was 10.9.8.

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 57 packages installed; audit reported 0 vulnerabilities. |
| `npm test` | PASS — 10/10 Vitest tests in 2 files. |
| `npm run build` | PASS — `tsc --noEmit` plus Vite 7.3.6 production build; `dist/` produced. |
| `npm run test:e2e` | PASS — 4/4 Chromium tests. |
| `npm run check` | PASS — repeated tests, production build, and 4/4 browser tests. |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities. |

No lint script is defined. The available TypeScript check is part of the exact
production build.

## End-to-end product exercise

The live product was exercised in fresh Chromium profiles, not just through the
repository suite:

- Started from the first-run state; added Alex and Sam; confirmed the free-tier
  third-member boundary routes to the household pass without creating a dialog.
- Created an Alex-owned school pickup and an Alex-to-Sam handoff, including
  location and notes. Both survived reload in IndexedDB.
- Confirmed empty required title is rejected by native validation and focused;
  equal start/end is rejected with “End time must be after the start time” and
  focus moves to End; recovery with a one-minute duration saves successfully.
- Confirmed title/location/note limits stop at 100/120/500 characters.
- Confirmed an event at 47 h 59 min appears on the 48-hour board, while an
  event at 48 h 01 min and a completed past event do not.
- Imported an ICS containing one valid owned pickup and one missing-`DTSTART`
  event: the pickup remained and the receipt said “1 event imported; 1
  skipped.” Non-ICS input, malformed JSON, and a 5,000,001-byte file each gave
  a specific recovery message. A 5,000,000-byte file passed the size gate.
- Exported ICS contained the owner and handoff From/To extension fields for all
  three events. JSON backup contained both members and all events.
- JSON restore cancellation preserved the existing calendar; acceptance
  replaced it and survived reload. Deleting an assigned member preserved the
  event and visibly changed it to “Needs an owner.” Erase cancellation
  preserved data; acceptance removed all members and events.
- Week sheet rendered seven days; print media restored seven columns, hid app
  chrome, and showed its print footer.

Repository unit coverage also passed UTC, floating/date-only, IANA DST,
folding/escaping, ownership round-trip, malformed-event retention, daily/weekly
recurrence, and unsupported-recurrence fallback cases.

## Accessibility, responsive behavior, and visual review

- Desktop 1440 px and mobile 390×844 were visually reviewed with representative
  owned pickup and handoff data. Layout hierarchy remained clear and no content
  was clipped; mobile `scrollWidth=clientWidth=390`.
- At 200% root text sizing on 390 px, the page still had no horizontal overflow.
- Live pages had `lang=en`, a changing descriptive title, exactly one h1, one
  main landmark, and no images missing `alt`.
- Keyboard Tab first reached “Skip to handoff board” with a 3 px visible focus
  ring. Enter opened the add dialog, autofocus reached its title, Escape closed
  it and returned focus to “+ Add handoff”; no trap was found.
- axe-core found **0 serious/critical findings** on desktop settings, the modal
  editor, and the 390 px view. A full dialog scan returned zero violations.
- Reduced motion yielded `1e-06s` transition and animation durations.
- No console errors or uncaught page errors occurred in normal, invalid-input,
  settings, mobile, or offline paths.
- The product-specific night-market art, single-mode palette, print treatment,
  and ownership tickets match `.factory/design.md`. The generated asset is
  disclosed and has prompt/provenance; no runtime font or image CDN is used.

The zero axe/Lighthouse findings do not supersede the directly measured
44×44-pixel contract failure above.

## PWA, privacy, and outbound requests

- Chromium reported no manifest errors. The 192 and 512 PNGs have the declared
  dimensions; the 512 icon includes `any maskable`; standalone display, theme,
  background, scope, and versioned start URL are present.
- The live page became controlled by the live `/sw.js`, then reloaded offline
  with both the shell and saved “Offline pickup” IndexedDB state intact and an
  explicit offline banner.
- Service-worker update behavior was tested with an in-memory local server that
  served the exact `dist/` files and changed only the worker version in its
  response. The new worker entered `waiting`, the app displayed “A fresh
  version is ready. Update now”, the action activated it, the old cache was
  removed, and `fhc-v3-qa-shell` reloaded offline. No candidate file was edited.
- Normal calendar use requested only
  `https://family-handoff-calendar.sociobot.in`. IndexedDB
  `family-handoff-calendar` held schedule data; normal-use localStorage and
  first-party cookies were empty. Source/network review found no analytics,
  remote fonts/scripts, geolocation, accounts, sync, or schedule uploads.
- The only optional outbound application call is license verification at
  `https://api.sociobot.in`; checkout is an explicit user action. The product
  has no sign-in, so the Entra authority requirement is not applicable.

## Deployment identity, budgets, and performance

Live responses byte-matched the candidate's fresh `dist/` output for `/`, the
hashed JS and CSS, worker, manifest, offline page, privacy and terms pages,
192 px icon, and full hero image. Representative SHA-256 values were:

- `/`: `b7b3efa5e3def067865dbfb1786778ce9278237593052beac3ec13d1d9c86967`
- JS: `8d8ba71cc52b70b026d2ade284ed211f5eb51d8b6c4d22e52bd74c02604e8557`
- CSS: `3481a6a549f025182e8835cae89505ecad7e93b110409e553e76d2368e2e2abb`
- worker: `d4c78a29ab3da4e4590de9ca9c656452e440464ccb8d6a40716dc633197fd25b`

| Budget | Actual | Result |
| --- | ---: | --- |
| Initial JS | 30,622 B / 10,950 B gzip | PASS (≤200 KB) |
| CSS | 17,645 B / 5,060 B gzip | PASS (≤50 KB) |
| Runtime fonts | 0 B | PASS (≤120 KB) |
| Largest hero | 49,720 B | PASS (≤300 KB) |

Fresh Lighthouse 12.8.2 mobile emulation against the live URL scored
**100 performance / 100 accessibility / 100 best practices / 100 SEO**. Lab
metrics were FCP 0.9 s, LCP 1.3 s, Speed Index 0.9 s, TBT 80 ms, and CLS 0.
No failed binary audit was reported. INP requires field interaction data and is
not claimed from this lab run.

## Required re-verification

1. Increase every undersized link hit area to at least 44×44 CSS px and retest
   the complete 390 px page, including footer and Household legal links.
2. Correct the README billing-default sentence.
3. Re-run `npm run check`, the mobile geometry audit, axe, offline/update smoke,
   live byte identity, and the billing burst before changing this verdict.
