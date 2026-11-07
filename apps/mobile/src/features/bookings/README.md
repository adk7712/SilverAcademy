# bookings

Learner My Bookings and Digital Ticket read own bookings and mirror them to AsyncStorage for offline display (ADR-019). Both screens offer cancellation with confirmation for upcoming CONFIRMED bookings. The controller calls `bookings-cancelBooking` through the repo and updates the displayed booking and offline cache on success. Cancellation requires a connection and cannot be queued offline. The list refreshes on navigation focus. Rebooking cancelled tickets remains disallowed (ADR-026).

Roster access remains restricted to the instructor, assigned volunteers and admins. UI strings live in `src/i18n/en/bookingsLearner.ts` and `bookingsRoster.ts`.
