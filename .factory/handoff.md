# Independent QA handoff — FAIL

**Candidate tested:** `bbee668d3413d53f5f3bae41b3e9ef5de301bd75`

**Live URL:** <https://family-handoff-calendar.sociobot.in>

**Tested:** 2026-08-28 UTC

**Release verdict:** **FAIL**

The candidate and deployment pass the real family-handoff workflow, clean
build/tests, privacy, checkout, rate limiting, caching, response hardening,
accessibility automation, bundle/performance budgets, and PWA offline/update
checks. Release acceptance still fails one explicit baseline: several mobile
links have hit boxes smaller than the required 44×44 CSS px.

## Defects

- **Medium:** At 390 px, the home/brand link is 36 px high, Household legal
  links are 19 px high, footer legal links are 15 px high, and the focused skip
  link is 43 px high. Add padding/minimum block sizes and remeasure the whole
  page. Primary controls already meet the requirement.
- **Low:** README says billing defaults to the pilot API, but candidate and live
  production correctly default to `https://api.sociobot.in`.

Full measurements and evidence are in
[`.factory/verification-2.md`](verification-2.md).

## Verification summary

- Clean `npm ci`: 57 packages, 0 vulnerabilities.
- `npm test`: 10/10 passed.
- `npm run build`: TypeScript and exact Vite production build passed; `dist/`
  produced.
- `npm run test:e2e`: 4/4 passed.
- `npm run check`: passed the repeated full repository gate.
- Live candidate identity: ten representative shell, bundle, PWA, legal, icon,
  and hero responses byte-matched fresh `dist/` output.
- Live browser: desktop and 390 px workflows passed; zero console/page errors;
  zero axe serious/critical findings; visible keyboard focus and correct modal
  focus return; reduced motion passed.
- PWA: live controlled offline reload retained saved data; a waiting-worker
  update showed the toast, activated, cleared the old cache, and reloaded its
  updated shell offline.
- Billing: checkout returned 303 to hosted Dodo checkout. An 80-request,
  concurrency-40 verification burst returned 30×200 and 50×429, with
  `Retry-After: 4` on every 429. The previous shared-service blocker is fixed.
- Lighthouse mobile: 100 performance / 100 accessibility / 100 best practices /
  100 SEO; FCP 0.9 s, LCP 1.3 s, TBT 80 ms, CLS 0.
- Budgets: JS 30,622 B, CSS 17,645 B, runtime fonts 0 B, largest hero 49,720 B.

## Run the verified gates

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run check
npm audit --omit=dev
```

## Known test boundary and next step

No real payment was submitted; checkout redirect, invalid-token verification,
CORS, daily verdict caching, and rate limiting were verified without a purchase.
The product has no sign-in or backend of its own. Fix the two defects above,
deploy the resulting candidate, and repeat the focused mobile geometry check
plus the complete release gate before marking PASS.

No product code was modified during this independent QA run.
