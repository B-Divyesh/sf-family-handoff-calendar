# Repair handoff — PASS

**Work order:** `family-handoff-calendar-repair-2`

**Verifier report:** `da775fa08cc62802e163085206a1581206198707`

**Repaired candidate:** `ced677d1cbe80c9135f99457504b7345d4db24e0`

**Live URL:** <https://family-handoff-calendar.sociobot.in>

**Deployment:** Azure Static Web Apps `f9a959c2-277f-42ca-9fb7-5e785d9f903b`, 2026-08-28 UTC

## What changed

- Added explicit 44 px minimum hit areas to the header brand, focused skip link, Household legal links, and footer legal links. Existing gaps and the night-market visual system are unchanged.
- Added a 390 px Playwright regression that measures the rendered bounding box of every link named by the verifier and fails below 44×44 CSS px. It also checks that the repair introduces no horizontal overflow.
- Corrected README billing guidance: production defaults to `https://api.sociobot.in`; `VITE_BILLING_BASE` remains the explicit staging override.
- Added a documentation-policy regression that checks both billing statements against the source default.
- Advanced the PWA cache from `fhc-v2` to `fhc-v3` so installed copies receive the repair and remove the old shell cache.

No calendar, import/export, ownership, license, privacy, or paid-tier behavior was changed.

## Reproduction and regression evidence

Before the repair, a fresh 390×844 Chromium run reproduced the verifier's measurements:

| Target | Before | Live repair |
| --- | ---: | ---: |
| Header brand/home | 224.55×36 px | 224.55×44 px |
| Focused skip link | 228.03×43 px | 228.03×44 px |
| Household Privacy | 57.94×19 px | 57.94×44 px |
| Household Terms | 47.13×19 px | 47.13×44 px |
| Footer Privacy | 47.47×15 px | 47.47×44 px |
| Footer Terms | 38.61×15 px | 44×44 px |

`tests/e2e/app.spec.ts` now measures those actual rendered boxes. `tests/release-policy.test.ts` now fails if README again names the wrong production default.

## Clean repository gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 57 packages installed; 0 vulnerabilities. |
| `npm test` | PASS — 11/11 Vitest unit and release-policy tests. |
| `npm run build` | PASS — TypeScript `tsc --noEmit` and Vite 7.3.6; `dist/index.html` produced. |
| `npm run test:e2e` | PASS — 5/5 Playwright 1.58.2 Chromium tests. |
| `npm run check` | PASS — the complete unit, type/build, and browser gate from a fresh server. |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities. |
| `git diff --check` | PASS. |

There is no separate lint script in this repository; the production TypeScript check is part of `npm run build`.

## Browser, accessibility, privacy, and PWA

- Desktop 1440 px and mobile 390×844 were visually reviewed. Mobile remained `scrollWidth=clientWidth=390`; 200% root text also remained 390 px wide.
- Playwright axe-core 4.10.2 found 0 serious/critical issues on the first screen, Household view, mobile view, and open event dialog. The factory `verify-url.sh` passed title, `lang=en`, one h1, main landmark, alt text, labels, and zero console/page errors.
- Keyboard smoke passed: the skip link has visible focus, Enter opens the event dialog onto its title input, Escape closes it, and focus returns to “+ Add handoff”. Reduced motion reports `1e-06s` transitions and animations.
- A fresh normal-use flow requested only `https://family-handoff-calendar.sociobot.in`. Calendar data appeared only in IndexedDB `family-handoff-calendar`; localStorage and cookies remained empty without a license.
- A saved “Live offline pickup” survived a controlled-worker offline reload with the offline notice visible.
- An in-memory update test changed only the served worker revision. The worker entered `waiting`, displayed “A fresh version is ready”, activated through “Update now”, removed the old cache, and reloaded the `fhc-v3-repair-shell` offline.
- Live Lighthouse 12.8.2 mobile scores: **100 performance / 100 accessibility / 100 best practices / 100 SEO**. FCP 0.9 s, LCP 1.4 s, Speed Index 0.9 s, TBT 0 ms, CLS 0.

## Budgets and live delivery identity

| Budget | Built result |
| --- | ---: |
| Initial JS | 30,622 B / 10,950 B gzip |
| CSS | 17,839 B / 5,090 B gzip |
| Runtime fonts | 0 B |
| Largest hero image | 49,720 B |

Ten live responses byte-matched the fresh `dist/` build: root, hashed JS, hashed CSS, worker, manifest, offline page, Privacy, Terms, 192 px icon, and full hero. Representative SHA-256 values:

- `/`: `bcbeff0f1d92a430a0517ea5dfa00652d31f8cb43eb42e6a5c5be7935c4a8ae0`
- `/assets/index-DZ1-tFXs.js`: `982c51e7ea5b9e60a4949a78c984808aff26f22e604b8b54f6a536945b6ccfcf`
- `/assets/index-Mrs4zp7u.css`: `dc44cb0fbd50a2a2f89179a0ca1c75cdc10cf9847180d428ad2a9a512278bfa4`
- `/sw.js`: `5fbfdf5725022fffc291fd7f5730c929062e96c0b8187719794baf80855bd893`

Live response policy also matches the repository: root `no-cache`; hashed assets one-year immutable; worker `no-cache, no-store, must-revalidate`; manifest `no-cache` with `application/manifest+json`; restrictive CSP and Permissions-Policy; DENY framing, nosniff, strict referrer policy, and HSTS.

## Billing and license evidence

- Checkout returned HTTP 303 to a hosted `checkout.dodopayments.com/session/...` URL. No purchase was made.
- An 80-request verification burst at concurrency 40 completed in 585 ms with **30× HTTP 200 and 50× HTTP 429**. Every 429 returned `Retry-After: 4`.
- Invalid verification returned HTTP 200 with `{"expires_at":null,"reason":"invalid","valid":false}`, `Cache-Control: no-store`, and CORS allowing the live origin.
- A returned URL token was stored under `sb_license:family-handoff-calendar`, stripped from the URL, and verified once. A fresh cached verdict made zero calls on reload; a two-day-old verdict made one call.

## Run and deploy

```sh
npm ci
npm run check
npm audit --omit=dev
/opt/fleet/lib/deploy-static.sh family-handoff-calendar ./dist
VERIFY_NODE_MODULES="$PWD/node_modules" /opt/fleet/lib/verify-url.sh \
  https://family-handoff-calendar.sociobot.in /tmp/fhc-live-evidence
```

## Known boundary

No real payment was submitted. Hosted checkout redirect, invalid-token verification, CORS, verdict caching, and rate limiting were verified without a purchase. There are no remaining repository or deployment blockers found in this repair run.
