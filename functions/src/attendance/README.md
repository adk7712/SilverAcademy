# attendance

UC #1-4 / #3-4 ScanAttendance. One callable: `attendance-recordAttendance` (SENIOR_INSTRUCTOR, VOLUNTEER), QR payload or manual ticket code. Design: `docs/architecture.md` 4.2, 4.3.

- `controller/decideAttendance.ts` (pure): `decideAttendance` with the check order NOT_FOUND -> NOT_AUTHORISED_FOR_WORKSHOP -> SESSION_NOT_ACTIVE -> NO_BOOKING -> WRONG_WORKSHOP -> ALREADY_ATTENDED; `decideScannerRole` (owner SI, or ASSIGNED volunteer holding VOLUNTEER), `isSessionActive` (OPEN/COMPLETED + check-in window, `ignoreCheckInWindow` bypasses only the window), `methodOf`.
- `repo/attendanceRepo.ts`: `findBookingIdByTicket` (normalised code, scoped to the workshop, else TICKET_NOT_FOUND) and `recordAttendanceTx` (create `attendance/{bookingId}`, booking ATTENDED, `attendedCount` +1, wallet + `ledger/earn_{bookingId}` for the instructor, audit `ATTENDANCE_RECORD`).
- `handlers/recordAttendance.ts`: `verifyQr` (INVALID_QR) or ticket lookup, then the tx. `recordAttendance(ctx, { ignoreCheckInWindow? })` is exported for tests; default reads `DEMO_IGNORE_CHECKIN_WINDOW`.
- Tests: `attendance.test.ts` (decide* + wrapper role/input checks), `attendance.emu.test.ts` (emulator: happy paths, every error, concurrent double scan -> one attendance, one point).
