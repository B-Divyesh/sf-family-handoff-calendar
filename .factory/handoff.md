# Build handoff

## Delivered

Family Handoff Calendar is a complete static/offline PWA for the brief’s core job: a household can name responsible people, add or edit pickup/drop-off/handoff tickets, spot unassigned responsibility in the next 48 hours, import an existing ICS calendar, export an interoperable ICS or complete JSON backup, and print a seven-day handoff sheet.

The data layer is local-first IndexedDB. There are no accounts, analytics, third-party runtime assets, location access, or background sync. The service worker precaches the versioned shell and runtime assets, claims active clients, supports an in-app update action, and falls back cleanly offline. The manifest includes 192px and 512px maskable-capable icons.

The optional $12 one-time household pass follows the Sociobot license contract: hosted buy link, query-token capture and URL cleanup, local token/cache, at-most-daily verification, optimistic cached offline unlock, invalid/revoked handling, and paste-to-restore. It unlocks a third or later household member; the useful two-person board, import/export, print, privacy, and accessibility features remain free. The current default uses the pilot API and can be changed with `VITE_BILLING_BASE` for release.

The original night-market still life was generated with the factory Azure OpenAI image deployment, manually reviewed, and reduced from a 2.2 MB source PNG to 49 KB and 21 KB responsive WebP deliveries. Full prompt and provenance are in `.factory/design.md` and `assets/src/`.

## Verification

- `npm test`: 7 unit tests pass (ICS folding, UTC/date-only/IANA timezone conversion, ownership round-trip, malformed-event recovery, weekly recurrence, unsupported recurrence fallback).
- `npm run build`: passes; output is `dist/` with `dist/index.html` at its root.
- Production bundle: 30.6 KB JS / 17.7 KB CSS uncompressed (11.0 KB / 5.1 KB gzip); no runtime fonts or third-party scripts; hero variants are 49 KB and 21 KB.
- `npm run test:e2e`: 4 Chromium tests pass: full two-member handoff flow and refresh persistence, axe serious/critical scan plus keyboard dialog path, true offline reload through the service worker, and 390×844 mobile overflow/layout.
- Factory `verify-url.sh` against the production preview: HTTP 200, title present, `lang=en`, exactly one `h1`, main landmark present, zero images missing alt, zero unlabeled buttons, and zero browser console errors.
- Lighthouse mobile against the final production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s, TBT 10 ms, CLS 0.
- `npm audit`: zero production dependency vulnerabilities and zero total known vulnerabilities after upgrading Vite/Vitest.

## Known gaps and next steps

- Monthly/yearly recurrence rules are preserved as the first occurrence with a visible warning; `RECURRENCE-ID` overrides and custom `VTIMEZONE` definitions are not expanded. Daily/weekly rules and browser-supported IANA timezone IDs work.
- The PWA deliberately has no multi-device sync. Sharing is explicit through a downloaded ICS or JSON file, as required by the privacy brief.
- Billing remains on the factory pilot API until release configuration supplies the production base and the factory registers the product.
- Validate the final deployment headers (especially immutable `/assets/` caching and HTTPS service-worker scope) after the factory deploys `dist/`.

## Runbook

```sh
npm install
npm test
npm run build
npm run test:e2e
npm run preview
```

Deploy only the contents of `dist/`. No secrets or infrastructure changes are required.
