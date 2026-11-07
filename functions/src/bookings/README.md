# bookings

UC #2-2 BookWorkshops, #2-3 My Bookings / Digital Ticket (direct client reads, callable cancellation), #3-3 roster / SI class list.
Callables: `bookings-bookWorkshop` (LEARNER), `bookings-cancelBooking` (LEARNER, own booking), `bookings-getRoster` (SENIOR_INSTRUCTOR owner, VOLUNTEER assigned, ADMIN).

- `controller/decideBooking.ts` `decideBooking` (pure, architecture.md 4.1): NOT_FOUND -> CANNOT_BOOK_OWN_WORKSHOP -> WORKSHOP_NOT_OPEN -> WORKSHOP_STARTED -> ALREADY_BOOKED (`details.bookingId`, any status) -> WORKSHOP_FULL. `snapshotToIso` for output.
- `controller/ticketCode.ts` `generateTicketCode(random)`: 8 Crockford base32 chars (unbiased, `byte % 32`).
- `controller/decideRoster.ts` `decideRosterAccess` (NOT_FOUND -> allow ADMIN / owner SI / ASSIGNED volunteer -> NOT_ASSIGNED if caller is a volunteer -> PERMISSION_DENIED) and `buildRoster` (CONFIRMED/ATTENDED only, never `qrPayload`, sorted by name).
- `repo/bookingRepo.ts` `createBooking`: one transaction reading `workshops/{id}` + `bookings/{id}_{uid}`, then `tx.create` booking (ticketCode, `signQr` payload, workshop snapshot), `seatsTaken + 1`, `notifyTx` BOOKING_CONFIRMED. Same-doc contention serialises bookings; capacity cannot be exceeded.
- `repo/rosterRepo.ts`: plain reads (workshop, assignment, roster bookings, assigned volunteers).
- Tests: `bookings.test.ts` (unit), `bookings.emu.test.ts` (emulator: atomicity, 20-parallel capacity-5, parallel double-book, roster RBAC).

- `controller/decideCancellation.ts` and `repo/bookingRepo.ts` `cancelBooking`: own CONFIRMED ticket on an OPEN workshop before its live start time becomes CANCELLED, releasing one seat atomically. Retains the ticket; repeated cancellation succeeds without a second decrement. ATTENDED cannot cancel; rebooking stays disallowed (ADR-026).
