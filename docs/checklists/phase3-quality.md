# Phase 3 – Integration and Quality

- [x] Learner Booking Journey: backend path verified end to end by `npm run e2e` (booking, capacity, duplicate, ticket and QR payload) (3.1)
- [ ] Learner Booking Journey: UI click-through on device or browser not complete (mobile screens and offline ticket not run; see `known-limitations.md` V1, V2, V6)
- [x] Instructor Check-In Flow: backend path verified end to end by `npm run e2e` (scan, once-only, points, ledger, roster, redeem) (3.1)
- [ ] Instructor Check-In Flow: UI and camera scan not run on a device (see `known-limitations.md` V1, V2)
- [x] Partner approval and Admin voucher upload: backend path verified by `npm run e2e`; web page loads verified (3.1)
- [ ] Partner approval and Admin voucher upload: web mutation flows not clicked (see `known-limitations.md` V3)
- [x] Opus review: concurrency, atomicity, RBAC holes, layering violations resolved (3.2 found, 3.3 fixed; see review-findings.md for deferred Lows)
- [x] Dead code removed, naming consistent (3.3: unused placeholder components and strings removed; no non-test source file over 200 lines)
- [ ] NFR checks: 44px targets (checked in code, not on device), scan < 3s, search < 2s on seed data, ticket viewable offline (see `known-limitations.md` V9)
- [x] Root README, per-module READMEs, dev-guide and demo script done (3.4; per-module READMEs not audited)
- [x] progress.md, use-case-coverage.md and handoffs verified accurate (3.4)
