# Phase 1 – Core Backend

- [x] Mock Singpass AuthProvider with age/role check and role-toggle claim (1.1)
- [x] RBAC and firestore.rules enforce role access; denial tests pass (1.1)
- [x] Booking: capacity, no duplicates, ticket + QR payload, concurrency-safe (1.2)
- [x] Attendance: QR validation, assigned-staff check, once-only, points awarded (1.3)
- [x] Voucher redeem is all-or-nothing; upload dedupes codes (1.4)
- [x] Workshop CRUD, venue request/approval, volunteer opt-in (1.5)
- [x] MapProvider with OneMap and stub implementations; distance sorting (1.6)
- [x] Audit-log helper and admin flag/suspend/reactivate; admin workshop edit/status/cancel; instructor review; feedback; reports/incidents (1.7)
- [ ] Jest tests: over-capacity, duplicate booking, double attendance, redeem rollback, RBAC denials (1.8)
- [x] Lint and tests pass; handoffs for 1.1 to 1.7 and progress.md updated (1.8 remains open)
