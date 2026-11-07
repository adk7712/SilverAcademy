# attendance

UC #1-4 / #3-4 ScanAttendance. Callables: `attendance-recordAttendance` (SENIOR_INSTRUCTOR, VOLUNTEER; QR payload), `attendance-setCheckInCode` (instructor sets a session code) and `attendance-checkIn` (learner types it; ADR-030). Design: `docs/architecture.md` 4.2, 4.3.

- `controller/decideAttendance.ts` (pure): `decideAttendance` with the check order NOT_FOUND -> NOT_AUTHORISED_FOR_WORKSHOP -> SESSION_NOT_ACTIVE -> NO_BOOKING -> WRONG_WORKSHOP -> ALREADY_ATTENDED; `decideScannerRole` (owner SI, or ASSIGNED volunteer holding VOLUNTEER), `isSessionActive` (OPEN/COMPLETED + check-in window, `ignoreCheckInWindow` bypasses only the window).
- `repo/attendanceRepo.ts`: `recordAttendanceTx` (create `attendance/{bookingId}`, booking ATTENDED, `attendedCount` +1, wallet + `ledger/earn_{bookingId}` for the instructor, audit `ATTENDANCE_RECORD`).
- `handlers/recordAttendance.ts`: `verifyQr` (INVALID_QR), then the tx. `recordAttendance(ctx, { ignoreCheckInWindow? })` is exported for tests; default reads `DEMO_IGNORE_CHECKIN_WINDOW`.
- `handlers/checkInCode.ts`: `setCheckInCode` (owner only, writes `checkInCodes/{workshopId}`) and `checkIn` (own booking, matching code, then the same tx with `method: 'MANUAL'`).
- Tests: `attendance.test.ts` (decide* + wrapper role/input checks), `attendance.emu.test.ts` (emulator: happy paths, every error, concurrent double scan -> one attendance, one point).
