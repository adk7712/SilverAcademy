# Handoff: G Real events and real map

## Task
Issue #2: show real events on the app and on a real map.

## Agent / model
Bryan (Oseltamivir).

## What was built
- Seed: `firebase/seed/fixtures/realEvents.ts` holds the real events, appended to the demo data (unchanged). The first one is the onePA Digital Club @ Ayer Rajah (Singpass), Sat 21 Nov 2026, 10:00 to 12:00, Ayer Rajah CC, 609335. Its slot uses a fixed `startsAt`. It is OPEN on a BOOKED slot with an APPROVED request, taught by `senior-62` for the demo, and its capacity of 20 is a demo value.
- The second one is Christmas @ Changi Simei 2026 - Let's Jingle & Mingle, Sat 12 Dec 2026, 14:00 to 16:30, Changi Simei CC, 529915, organised by Changi Simei CC. It is set up the same way, taught by `senior-72` for the demo. Its capacity of 30 and the venue amenities are demo values; the onePA ticket price ($3) is only in the description.
- `Workshop.realEvent { organiser, sourceUrl }` (optional, seed-only: callables cannot set it).
- `fitTileView` (`packages/shared/src/services/map/osmTiles.ts`) fits OSM tiles and pins into a view. `WorkshopMap.tsx` draws them with `Image` and `Pressable`. It needs no SDK or token. Checked on web only.
- Discover has a List/Map toggle, with one pin per venue; tapping a pin lists that venue's workshops. The list is the fallback if every tile fails (ADR-003). The detail screen shows the venue pin, plus the organiser and the original-listing link for real events.

## Open issues
- To add more real events, add one entry per array in `realEvents.ts`.
- After 21 Nov and 12 Dec 2026, Discover hides each event (see V12).
- The map is static (no pan or zoom) and has not run on a device. OSM tiles are for demo use only.
