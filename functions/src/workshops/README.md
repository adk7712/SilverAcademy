# workshops

Workshop creation, directory/search, details, volunteer opt-in, feedback.

1.5 callables: `createWorkshop`, `updateWorkshop` (owner, DRAFT only), `optInVolunteer`, `withdrawVolunteer` (ADR-014). Rules in `controller/decideWorkshop.ts`, `decideVolunteer.ts`. Tests: `workshops.test.ts`, `workshops.emu.test.ts`.
