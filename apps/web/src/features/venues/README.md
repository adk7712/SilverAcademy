# venues (web)

Community Partner pages: UC #4-1 Manage Venue Availability and UC #4-2 Approve Venue Requests.

- `ui/` pages and dialogs (no Firebase, no repo). `controller/` pure rules (slot/facility validation, request queues, decision outcomes, error mapping) and hooks. `repo/` typed Firestore reads (`facilities`, `facilities/{id}/slots`, `venueRequests where partnerId == uid`) and `venues-*` callable wrappers; `mapRepo.ts` creates the shared `MapProvider` (stub unless `VITE_MAP_PROVIDER=onemap`).
- Copy lives in `strings.ts`.
- Tests: `npm run test -w @silveracademy/web`.
