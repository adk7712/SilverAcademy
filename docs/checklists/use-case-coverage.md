# Use-Case Coverage

Status as of task 3.4 (2026-10-19), taken from the handoffs and `review-findings.md`.

Legend:
- **Implemented:** the backend callable or direct read exists, and the UI screen exists where the use case needs one.
- **Tested:** `x` means automated coverage exists for the core rule (Jest, emulator tests or `npm run e2e`). `partial` means the backend is covered but the UI path is not.
- **Demo-ready:** `x` means the flow was run end to end in 3.1 or later on the emulators. `partial` means a backend path ran but a UI step (device, camera, click-through) has not. `-` means not demo-ready.

Note: the PDF text lists 24 distinct use case descriptions (IDs #0-1 to #5-5; no #1-1 appears in the text). The "26" count likely includes two diagram-only entries. Re-check against the PDF's use case diagram when `requirements-map.md` is final.

| UC ID | Name | Actor | Scope | Implemented | Tested | Demo-ready | Notes |
|-------|------|-------|-------|:-:|:-:|:-:|-------|
| #0-1 | AuthenticateWithSingpass | All mobile roles | In scope (mocked) | x | x | x | Mock picker; age and role check (`e2e`, 1.1 tests). Mobile login verified on mobile web (3.1). Real Singpass not built. |
| #0-2 | AuthenticateWithAdminCredentials | Admin, Partner | In scope | x | x | x | Staff login and `recordStaffLogin` in `e2e`. Web login verified in browser (3.1). |
| #1-2 | CreateWorkshop | Instructor | In scope | x | partial | partial | Backend (`createWorkshop`) in `e2e`. Mobile create form not run (3.1). |
| #1-3 | RequestVenue | Instructor | In scope | x | partial | partial | Request and approval in `e2e` and emulator tests. Mobile venue screen (list view, map is schematic) not run. |
| #1-4 | ScanAttendance (Instructor) | Instructor | In scope | x | x | partial | Backend and 5 emulator tests plus `e2e`. Camera scan and scanner UI not run on device. Manual code path verified in backend. |
| #1-5 | ViewWallet | Instructor | In scope | x | partial | x | Wallet shows 30 points for `senior-72` on mobile (3.1). Balance and ledger checked in `e2e`. |
| #1-6 | ViewPointsHistory | Instructor | In scope | x | partial | partial | Ledger entries written and checked in `e2e`. History screen not clicked. |
| #1-7 | RedeemVoucher | Instructor | In scope | x | x | partial | Redeem transaction (11 emulator tests) and `e2e`. Mobile redeem screen not run. |
| #2-1 | BrowseWorkshops | Learner | In scope | x | x | x | Discover with real data verified on mobile web (3.1). Filter and sort logic unit-tested. Search timing not measured (NFR). |
| #2-2 | BookWorkshops | Learner | In scope | x | x | x | Booking transaction (7 emulator tests) and `e2e`. Booking a workshop on mobile web verified (3.1). |
| #2-3 | ViewDigitalTicket | Learner | In scope | x | partial | partial | Ticket with QR and code verified on mobile web (3.1). Offline display not verified on device. |
| #2-4 | SubmitWorkshopFeedback | Learner | In scope | x | partial | partial | Callable with emulator tests (`adminFeedback.emu.test.ts`). Mobile feedback screen built in 2.6, not run. The functions catalogue no longer says "deferred UI". |
| #2-5 | SubmitUserReport | Learner, Instructor, Volunteer | In scope (thin version) | x | partial | - | `reports-submitReport` emulator tests. Mobile report form and attachment upload not run. |
| #3-1 | ViewWorkshops | Volunteer | In scope | x | partial | partial | Opportunities list and filters unit-tested. Mobile screens not run. |
| #3-2 | AssistWorkshop | Volunteer | In scope | x | x | partial | Opt-in (5 parallel opt-ins and capacity tests) and `e2e`. Mobile assist screen not run. |
| #3-3 | ViewAssigned | Volunteer | In scope | x | x | partial | Assigned list and roster access rules in `e2e`. Mobile screen not run. |
| #3-4 | ScanAttendance (Volunteer) | Volunteer | In scope | x | x | partial | Volunteer manual-code attendance in `e2e` and emulator tests. Scanner UI not run on device. |
| #4-1 | ManageVenueAvailability | Partner | In scope | x | partial | partial | Facility and slot callables with emulator tests. Web page loads verified (3.1). Add, edit and delete clicks not run. |
| #4-2 | ApproveVenueRequests | Partner | In scope | x | x | partial | Approval, slot lock and SLOT_CONFLICT in `e2e` and emulator tests. Web approve, reject and request-info clicks not run. |
| #5-1 | ManageAccounts | Admin | In scope | x | partial | partial | Flag, suspend and reactivate in `e2e` and emulator tests. Web account list loads (3.1). Suspend via UI not clicked. |
| #5-2 | ManageWorkshops | Admin | In scope (basics) | x | partial | partial | Admin edit, status change and cancel in emulator tests. Web list and detail load. Mutations via UI not clicked. |
| #5-3 | ResolveUserReports | Admin | In scope (thin incident queue) | x | partial | partial | `updateIncident` tests. Web queue loads (3.1). Status updates not clicked. Reporter reply (AWAITING_INFO) not built (L7). |
| #5-4 | ManageVoucherInventory | Admin | In scope | x | x | partial | Upload with dedupe (`e2e` and emulator tests). Web upload and inventory loaded (3.1). Upload via UI not clicked. |
| #5-5 | ReviewInstructorAndCurriculum | Admin | In scope (instructor review); curriculum review deferred | x | x | partial | Instructor approve and reject in `e2e` and emulator tests. Web review page loads. Curriculum review deferred (ADR-009). |

Summary (task 3.4):
- All 24 rows in the table have an implemented backend path, and every row with a UI has a screen in the code.
- Demo-ready in full (`x` on demo-ready): #0-1, #0-2, #1-5, #2-1, #2-2. The rest are partial, pending the UI checks listed in `known-limitations.md` section 1.
