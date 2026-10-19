# venues

Facilities, slots, venue requests and approval, MapProvider.

Callables (`venues-*`): `upsertFacility`, `upsertSlot`, `deleteSlot`, `requestVenue`, `decideVenueRequest`, `respondToInfoRequest`, `withdrawVenueRequest`. Pure rules in `controller/` (`decideSlot`, `decideVenueRequest` (request validation), `decideVenueDecision` (partner decision), `conflicts`), transactions in `repo/`. Approval locks the slot, opens the workshop and conflicts rival requests in one transaction (architecture 4.6). Tests: `venues.test.ts` (unit), `venues.emu.test.ts` (emulator).
