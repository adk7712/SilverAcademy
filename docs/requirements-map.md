# SilverAcademy Requirements Map (SC2006 SCSB)

Source: SC2006 Lab 2 deliverables spec (functional requirements 1.1 to 6.36, NFRs 1.1 to 7.5, use case descriptions).

Notes on the mapping:
- Module names come from the allowed list. Screen names are proposed from the use case flows (the spec has no screen list). "M" = mobile app, "W" = web app.
- Firestore entity names are proposed from the use case text, since the class diagram is an external link. Entities marked "(inferred)" are not named in the spec.
- The spec contains **24** use cases, not 26 (see ambiguity 1).

## 1. Use case map

| Use Case ID | Name | Actor | Related FR / NFR | Module | Screen (M/W) | Firestore entities touched | Key exceptions / rules | Priority |
|---|---|---|---|---|---|---|---|---|
| #0-1 | AuthenticateWithSingpass | Senior Instructor, Learner, Volunteer | FR 1.1-1.4; NFR 1.1, 4.6, 7.4 | auth | M: Login with Singpass | User, InstructorProfile (eligibility), Session (inferred) | Singpass fails: reject. Singpass down: service-unavailable message. Profile/role unreadable: deny access. Age 50+ enables SI/Learner toggle | High |
| #0-2 | AuthenticateWithAdminCredentials | Admin, Community Partner | FR 5.1, 6.1; NFR 1.2-1.4 | auth | W: Management Portal Login | User (Admin/CP), AuditLog, Session (inferred) | Bad credentials: generic "Invalid Credentials" and clear form. Suspended/Inactive: halt and contact platform team. Log all success and failed attempts | High |
| #1-2 | CreateWorkshop | Senior Instructor | FR 2.1-2.3; NFR 2.1, 2.2 | workshops | M: Create Workshop | Workshop, InstructorProfile (read) | Requires approved profile. Mandatory fields validated. "Appropriate registration status" not defined | High |
| #1-3 | RequestVenue | Senior Instructor | FR 2.4-2.6; NFR 7.4 | venues | M: Request Venue (map, list fallback) | VenueRequest, Venue/Facility, VenueSlot (read), Workshop | Slot unavailable: ask for another selection. Map down: list view | High |
| #1-4 | ScanAttendance (Senior Instructor) | Senior Instructor (Volunteer in assistant mode) | FR 2.7-2.10; NFR 3.1, 3.2, 4.3, 7.3 | attendance | M: Scan Attendance | Booking, DigitalTicket, Attendance, Workshop, Wallet, WalletTransaction | Invalid QR, no booking, duplicate: reject. Camera down: manual booking ID (not in FR). Point awarded only if SI operates scanner (conflicts with postcondition) | High |
| #1-5 | ViewWallet | Senior Instructor | FR 2.11; NFR 2.1-2.3 | vouchers | M: Wallet | Wallet, WalletTransaction (read), Voucher (tier list) | DB connection drops: "Unable to retrieve current balance" message | High |
| #1-6 | ViewPointsHistory | Senior Instructor | FR 2.12; NFR 2.1 | vouchers | M: Points History (from Wallet) | WalletTransaction (read-only), Workshop, Voucher | Read-only ledger. Must scroll smoothly for elderly users | Medium |
| #1-7 | RedeemVoucher | Senior Instructor | FR 2.13-2.15, 6.28; NFR 3.3, 4.4, 6.3 | vouchers | M: Redeem Voucher | Voucher, Wallet, WalletTransaction, AuditLog | Insufficient points: show required points. No unclaimed voucher: reject without deduction. Failure: neither deduct nor claim (atomic). "Milestone" rule undefined | High |
| #2-1 | BrowseWorkshops | Learner | FR 3.1-3.5; NFR 3.4, 5.3 | workshops | M: Workshop Directory | Workshop, Venue (location), Category (inferred) | Keyword and filters combined. No results: "No workshops found". No location: browse without proximity. Sort by distance and recommendations have no flow step | High |
| #2-2 | BookWorkshops | Learner | FR 3.7-3.10; NFR 4.1, 4.2 | bookings | M: Workshop Details / Book | Booking, Workshop (seat count), DigitalTicket | Status must be Open for Registration with a free seat. No duplicate booking. Full: alert. Booking must be atomic and capacity-safe | High |
| #2-3 | ViewDigitalTicket | Learner | FR 3.11, 3.12; NFR 4.5 | bookings | M: My Bookings / Digital Ticket | Booking, DigitalTicket, Attendance (read) | No confirmed booking: no ticket. Concluded workshop: show attendance status. High-contrast QR. Must work offline | High |
| #2-4 | SubmitWorkshopFeedback | Learner | FR 3.13, 3.14 | workshops | M: Workshop Feedback Form | Feedback, Attendance (check), Workshop, InstructorProfile (rating aggregate, inferred) | Must be Attended. Expiry window undefined (notes suggest 7 days). Aggregation not in FR | Medium |
| #2-5 | SubmitUserReport | Learner | FR 3.15, 3.16, 6.13, 6.14 | reports | M: Report an Issue | Incident, Attachment (Firebase Storage), AdminIncidentQueue (inferred) | Missing fields: block. Oversized file: reject. Failure: no partial incident. Unique reference number returned | Medium |
| #3-1 | ViewWorkshops | Volunteer | FR 4.1, 4.2 | workshops | M: Volunteer Opportunities | Workshop, WorkshopVolunteer (opt-in, inferred), Venue (location) | No nearby: inform user. No location: unordered list. Alt flow labelled "AF-S3" | High |
| #3-2 | AssistWorkshop | Volunteer | FR 4.3, 4.4 | workshops | M: Workshop Details / Assist | WorkshopVolunteer (inferred), Workshop | Duplicate opt-in: block and show status. Cancel: no record. Withdrawal not defined | High |
| #3-3 | ViewAssigned | Volunteer | FR 4.5, 4.6 | workshops | M: Assigned Workshops / Class List | WorkshopVolunteer (assignment check), Workshop, Booking (roster) | Not assigned: deny details and class list. Learner list restricted to assigned volunteers | High |
| #3-4 | ScanAttendance (Volunteer) | Volunteer | FR 4.7, 4.8; NFR 4.3, 7.3 | attendance | M: Scan Attendance (assistant) | WorkshopVolunteer (check), DigitalTicket, Booking, Attendance | Invalid QR: reject. Already checked in: inform. Other workshop: reject. Status Registered to Attended | High |
| #4-1 | ManageVenueAvailability | Community Partner | FR 5.2-5.4; NFR 5.2, 7.4 | venues | W: Venue Availability (incl. Add Facility) | Venue/Facility, VenueSlot, Workshop (conflict check) | Slot with approved booking cannot be removed or changed. Invalid availability: error. States Available, Unavailable, Under Maintenance | High |
| #4-2 | ApproveVenueRequests | Community Partner | FR 5.5-5.9 | venues | W: Venue Requests | VenueRequest, VenueSlot (set Booked), Workshop, Notification (inferred) | Approve re-checks slot. Double-booked: Conflicted, suggest alternative. Reject with optional reason. Awaiting Info state | High |
| #5-1 | ManageAccounts | Admin | FR 6.2-6.7; NFR 1.2, 1.4 | users | W: Manage Accounts | User, AuditLog | Flag, suspend, reactivate. No privilege: deny and log attempt. Stale edit: refresh. Suspension revokes access | High |
| #5-2 | ManageWorkshops | Admin | FR 6.8-6.12; NFR 1.4 | workshops | W: Manage Workshops | Workshop, Category (inferred), Booking (conflict check), AuditLog | Active bookings: conflict warning. Started/completed: restrict edits. Archive removes from discovery but keeps bookings and attendance | High |
| #5-3 | ResolveUserReports | Admin | FR 6.13-6.22; NFR 1.4 | reports | W: Admin Incident Queue | Incident, Attachment, User, Workshop, Notification (inferred), AuditLog | Status set: Under Review, Awaiting Information, Resolved, Closed. Already resolved: block conflicting updates. Unauthorised: reject. Cancel workshop only here (FR 6.20) | High |
| #5-4 | ManageVoucherInventory | Admin | FR 6.23-6.29; NFR 6.3, 1.4 | vouchers | W: Voucher Inventory | Voucher (isolated store), AuditLog | Duplicate or invalid-format codes rejected. Upload is transactional. Statuses Available, Claimed, Invalid, Removed | High |
| #5-5 | ReviewInstructorAndCurriculum | Admin | FR 6.30-6.36; NFR 1.4 | users | W: Instructor and Curriculum Review | InstructorProfile, Curriculum (inferred), AuditLog, Notification (inferred) | Reject needs reason (profiles). Return for revision needs reason (curriculum). Unauthorised: reject. Decision recorded with Admin and timestamp | High |

## 2. NFR map

| NFR | Requirement (short) | Modules / areas constrained |
|---|---|---|
| 1.1 | Singpass mandatory for SI and Learner (Volunteer omitted) | auth, users; mobile app login |
| 1.2 | Role-based access control for all five roles | auth, users, all modules (both apps) |
| 1.3 | Admin and CP passwords hashed, never plaintext | auth (#0-2), users |
| 1.4 | Log admin logins and security-sensitive admin actions | auth, users, workshops, reports, vouchers (audit log) |
| 2.1 | Adjustable text sizing for SI | M: SI screens (auth toggle, workshops, venues, attendance, wallet) |
| 2.2 | 44 x 44 px minimum touch targets | M: all primary controls; W: primary controls |
| 2.3 | SI dashboard links to Create Workshop, Scan Attendance, View Wallet | M: SI dashboard (workshops, attendance, vouchers) |
| 2.4 | Clear error messages for invalid or incomplete input | all modules (both apps) |
| 3.1 | Camera view within 3 s | attendance (M: Scan Attendance) |
| 3.2 | QR validation and attendance within 3 s | attendance |
| 3.3 | Voucher redemption and wallet deduction within 5 s | vouchers |
| 3.4 | Workshop search results within 2 s | workshops (BrowseWorkshops) |
| 3.5 | Standard requests within 2 s (excluding external services) | all modules |
| 4.1 | Booking completes fully or leaves record unchanged | bookings |
| 4.2 | Concurrent bookings never exceed capacity | bookings, workshops |
| 4.3 | Learner marked attended at most once per session | attendance |
| 4.4 | Voucher redemption is all-or-nothing | vouchers |
| 4.5 | Digital ticket accessible offline | bookings (M: ticket screen) |
| 4.6 | External service outage shows error without data corruption | auth (Singpass), venues and workshops (OneMap) |
| 5.1 | Support 10,000 concurrent users | all modules (backend) |
| 5.2 | Support 10,000 simultaneous OneMap requests | venues, workshops (map and location) |
| 5.3 | 95% of requests within 2 s under load | all modules (backend) |
| 6.1 | Modules for auth, workshops, bookings, attendance, vouchers, user management | architecture (NFR list has no venues or reports module) |
| 6.2 | Singpass and OneMap accessed via API/SDK interfaces | auth, venues, workshops (location) |
| 6.3 | Voucher inventory in isolated data store | vouchers, users |
| 6.4 | Documentation for APIs, entities, integrations | all modules |
| 7.1 | Mobile app for SI, Learner, Volunteer primary workflows | M: auth, workshops, bookings, attendance, vouchers, reports (Learner) |
| 7.2 | Web app for Admin and CP management workflows | W: users, workshops, reports, vouchers, venues |
| 7.3 | Supported camera and QR SDK | attendance (M), bookings (ticket display) |
| 7.4 | Integrate Singpass and OneMap via supported APIs or SDKs | auth, venues, workshops (map) |
| 7.5 | Web app usable on desktop and tablet | W: all admin and CP screens |

## 3. Ambiguities and inconsistencies

1. **Use case count**: the spec has 24 use cases (#0-1, #0-2, #1-2 to #1-7, #2-1 to #2-5, #3-1 to #3-4, #4-1, #4-2, #5-1 to #5-5), not 26. There is no #1-1, and the numbering starts at #1-2.
2. **ViewPointsHistory (#1-6)** precondition says "ViewWallet base use case dashboard screen (#1-6)". It refers to itself. ViewWallet is #1-5.
3. **ApproveVenueRequests (#4-2)** description is copied from ManageVenueAvailability. The "Preconditions" field holds a description, and the real preconditions are missing.
4. **ApproveVenueRequests (#4-2)** includes "RequestVenue (Senior Instructor)", which is another actor's use case. The "Awaiting Info" and "Conflicted" states are not in FR 5.x.
5. **Volunteer ScanAttendance (#3-4)** has "Includes: assistworkshop" (lowercase, unlinked). Opt-in is not a dependency of scanning. Assignment is the real precondition.
6. **ScanAttendance (#1-4)** lists only SI as actor, but step 1 allows Volunteers. The Volunteer version (#3-4) has the same name, so there are two "ScanAttendance" use cases.
7. **Points on scan**: the #1-4 postcondition says a point is always awarded. Step 8 awards it only when the SI operates the scanner. The assistant-mode outcome is unclear.
8. **Currency terms**: "points", "wallet credits", "balance", and "milestone total" are used interchangeably. The points-to-voucher denomination mapping and the point value per scan are not defined.
9. **Voucher status**: ManageVoucherInventory step 5 says "Unclaimed". FR 6.26 says "Available".
10. **Voucher eligibility**: RedeemVoucher requires a "minimum workshop milestone" and an "eligible" SI (FR 2.13). Neither is defined.
11. **Admin login**: AuthenticateWithAdminCredentials uses User ID and password. FR 6.1 says "enterprise credentials". It is unclear whether this is SSO or local credentials.
12. **Singpass scope**: NFR 1.1 requires Singpass for SI and Learner only. Global 1.1 and #0-1 include Volunteers.
13. **Volunteer assignment**: AssistWorkshop records an opt-in, but ViewAssigned and ScanAttendance require an assignment. No use case or FR lets an SI or Admin assign or approve volunteers, and withdrawal is not covered.
14. **Who can report**: ResolveUserReports says reports come from "Learners or Volunteers". SubmitUserReport and FR 3.15 are Learner-only. Volunteers and SIs have no reporting path.
15. **Cancellation rules**: FR 6.20 allows cancelling a workshop only during incident resolution. ManageWorkshops Ex1 mentions cancellation and rescheduling in general, and no FR covers rescheduling.
16. **Approval dependency**: ReviewInstructorAndCurriculum has Approved, Rejected, and Requires Revision. FR 6.33 allows rejection of profiles only, and FR 6.36 allows revision of curriculum only. CreateWorkshop requires only an approved profile, so it is unclear whether curriculum approval must come first. The spec's own note leaves this open.
17. **Missing use cases or FRs**: no use case covers SI profile submission or resubmission (referenced by #5-5), Learner or Volunteer registration (FR 1.1 says "registration"), Admin onboarding or approval of CP organisations (#4-1 precondition 2), "Add Facility" (#4-1 alt flow), or viewing a submitted report's status (SubmitUserReport note). Pending-request notification SLA is in #4-2 but not in the NFRs.
18. **Feedback**: #2-4 Ex2 refers to an expiry window with no value (notes suggest 7 days). The postcondition's rating aggregation is not in FR 3.13.
19. **Free admission**: BookWorkshops Ex1 says "does not charge/book", but the assumption is that all workshops are free.
20. **Terminology**: "session" and "workshop" are used interchangeably (FR 2.8 "workshop session", NFR 4.3, BookWorkshops Ex1). Status values are not enumerated: workshop statuses (Open for Registration, Archived, Cancelled, Completed), booking statuses, and attendance (Registered vs Attended). The "active" time window for scanning is not defined.
21. **Browse and sort**: FR 3.4 (sort by distance from a "selected or permitted location") and FR 3.5 (recommendations) have no step in #2-1. The flow only filters by location. "Selected location" is not defined.
22. **Category taxonomy**: ManageWorkshops says Admins maintain categories, and BrowseWorkshops filters by category. No FR defines the taxonomy, and the notes call for it.
23. **Manual fallback**: the manual booking-ID entry (#1-4 Ex4) and the Volunteer assistant mode are not in FR 2.7 to 2.10.
24. **Module list**: NFR 6.1 lists six modules. The mapping needs venues and reports. Feedback and wallet/points have no module, so they were placed under workshops and vouchers.
25. **Account scope**: ManageAccounts searches "user accounts", but it is unclear whether Admin and CP accounts are in scope for flag or suspend.
26. **Placeholders**: several rules are left as examples ("e.g." in notes): escalation path, incident severity levels, response-time targets, notification SLA, and feedback expiry. ManageAccounts also lacks suspension rules and secondary approval.
27. **Minor**: ViewWorkshops labels its alternative flow "AF-S3" with no AF-S1 or AF-S2. Voucher code format (FR 6.24) and upload file format are not defined.
