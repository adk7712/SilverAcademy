# Handoff: G Real events and real map

## Task
Issue #2: show real events on the app and on a real map. One real event is listed so far: onePA Digital Club @ Ayer Rajah (Singpass), Sat 21 Nov 2026, 10:00 to 12:00, Ayer Rajah Community Club, 150 Pandan Gardens, Singapore 609335.

## Agent / model
Bryan (Oseltamivir).

## What was built
- Seed: a separate real-event group in `firebase/seed/fixtures/realEvents.ts`, appended to the demo facilities, slots, venue requests and workshops. The demo data and ids are unchanged. The real slot uses a fixed `startsAt`, not a seed-relative day offset. The event is OPEN on a BOOKED slot with an APPROVED request, so booking, tickets and check-in work as usual. It is taught by `senior-62` (Ahmad) for the demo. Capacity (20) is a demo value.
- Data: optional `Workshop.realEvent { organiser, sourceUrl }` in `packages/shared`.
- Map: `fitTileView` in `packages/shared/src/services/map/osmTiles.ts` fits OpenStreetMap raster tiles and pins into a fixed view (Web Mercator, zoom 10 to 16). `WorkshopMap.tsx` draws the tiles with `Image` and the pins with `Pressable`. It needs no map SDK or token, is built for iOS, Android and web (checked on web only), and shows the OSM attribution.
- Discover: a List/Map toggle. The map shows one pin per venue, labelled with its workshop count; tapping a pin lists that venue's workshops. If every tile fails, or no workshop has a venue, Discover shows the list instead with a note (ADR-003). A few missing tiles just show as blank squares.
- Detail: the venue map with one pin. For real events it adds a "Real event" badge, the organiser, a note to check the original listing, and a button that opens the source URL (https only).
- Workshop cards show a "Real event" badge.
- OneMap stays behind `MapProvider` for search and postal lookup. Nothing changed there.

## Files touched
`firebase/seed/fixtures/{realEvents,venues,workshopSpecs,workshops}.ts`, `packages/shared/src/entities/workshop.ts`, `packages/shared/src/services/map/{osmTiles,osmTiles.test,index}.ts`, `apps/mobile/src/features/workshops/controller/learnerDiscoverLogic{,.test}.ts`, `apps/mobile/src/features/workshops/ui/learner/{DiscoverScreen,WorkshopDetailScreen,WorkshopCard,WorkshopMap}.tsx`, `apps/mobile/src/i18n/en/workshopsLearner.ts`, docs.

## Interfaces exposed
- `fitTileView(items, width, height)`, `worldPx`, `OSM_TILE_URL`, `OSM_ATTRIBUTION` and `TILE_SIZE` from `@silveracademy/shared`.
- `venuePins(workshops)` and `safeSourceUrl(url)` in `learnerDiscoverLogic.ts`.
- `RealEventInfo` and `Workshop.realEvent?`.

## Open issues
- The second real event is waiting on YY (name, date, address, postal code). To add it, add one entry to each array in `realEvents.ts`.
- After 21 Nov 2026 the real event is in the past, so Discover hides it. Update the date or swap in a newer listing for later demos.
- The map is static (no pan or zoom) and has not run on a physical device. OSM tiles are for demo use only.
- The Ayer Rajah facility belongs to the demo partner (`partner01`) because the seed has one partner account.

## Notes for next agent
- Seed counts are now 4 facilities, 12 slots, 7 venue requests and 9 workshops. No test asserted the old counts.
- The real event's id is `ws-real-01`. The demo flows still use `ws-01` to `ws-08`.
