# Repair handoff — deployed with one external blocker remaining

**Base verified candidate:** `578df1125e2f8f31593f852b33254ecba50782ba`
**Repair commit:** `f3741a54821f25c44587532e3c478e7d0b5a1428` (`fix: harden release delivery and billing default`)
**Live URL:** <https://family-handoff-calendar.sociobot.in>
**Deployed:** 2026-08-28 UTC via Azure Static Web Apps, deployment `170024e6-721c-4435-917c-ebdc8928f955`

## What changed

- Changed the client’s default billing base from the pilot host to the live Sociobot billing host. `VITE_BILLING_BASE` remains an explicit staging override.
- Added `public/staticwebapp.config.json`, deployed as the Static Web Apps response policy: strict CSP, Permissions-Policy, anti-framing, nosniff/referrer policy, immutable `/assets/*`, no-cache PWA entry points, and conventional manifest MIME.
- Added three exact regression tests in `tests/release-policy.test.ts` for the live billing default, cache/MIME policy, and browser hardening policy.

## Live evidence

- Live checkout now returns `303` to `https://checkout.dodopayments.com/session/...`. The shared factory product registry has enabled test and live $12 one-time entries for this slug with return URL `https://family-handoff-calendar.sociobot.in/`.
- The root is `Cache-Control: no-cache`; live hashed JS/CSS are `public, max-age=31536000, immutable`; `sw.js` is `no-cache, no-store, must-revalidate`; and the manifest is `application/manifest+json` with `no-cache`.
- Live HTML has CSP with `frame-ancestors 'none'`, restrictive Permissions-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Live root, JS, CSS, worker, manifest, offline page, and legal pages byte-match `dist/`. JS is 30,622 bytes (10,950 gzip), CSS 17,645 bytes (5,060 gzip), and the largest hero asset 49,720 bytes.

## Verification run

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 57 packages; audit reported 0 vulnerabilities. |
| `npm test` | PASS — 10/10 Vitest tests, including three release-policy regressions. |
| `npm run build` | PASS — type check and Vite build; `dist/index.html` present. |
| `npm run test:e2e` | PASS — 4/4 Chromium tests: persistence, axe/keyboard dialog path, offline reload, 390px layout. |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities. |
| Live `verify-url.sh` | PASS — HTTP 200, title, lang, one h1, main, alt coverage, labeled buttons, zero console errors. |
| Live browser smoke | PASS — 0 console/page errors; 0 axe serious/critical; keyboard Enter/Escape dialog path; 390px `scrollWidth=clientWidth=390`; reduced motion `1e-06s`; controlled-worker offline reload passes. |
| Live privacy/network | PASS — normal use requests only the first-party host; no analytics, third-party assets, cookies, or license request without a token. |

The Lighthouse CLI could not connect to the preinstalled Playwright Chromium (`Unable to connect to Chrome`), so no fresh score is claimed. Playwright/axe and all product-specific browser checks passed.

## Unresolved release blocker — shared billing API

Checkout and static-host findings are repaired and live. The independent verifier’s remaining rate-limit finding is **not repairable in this static product repository**: the shared Sociobot `/verify` route bypasses the API’s configured global limiter. An 80-request, concurrency-40 burst against both live and pilot verification URLs still produced `80 × 200`, `0 × 429`, and no `Retry-After`. Lowering the shared `RATE_LIMIT_MAX_REQUESTS` setting to 40 did not affect this route, so it was immediately restored to the original `500/60s` value rather than changing unrelated API behavior.

The remaining required service-side fix is a per-client/per-product verification limiter returning `429` with `Retry-After`, implemented and tested in the Sociobot billing API source/deployment. Re-run the same 80/40 burst after that shared-service release before declaring the product fully released.

## Run/deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e
/opt/fleet/lib/deploy-static.sh family-handoff-calendar ./dist
```

The PWA remains static, offline-first, and IndexedDB local-first. Calendar data leaves the browser only through explicit import/export.
