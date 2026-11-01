# Work Assignments

Source: `next-steps.md`, `known-limitations.md`, plus two new items from the TA (real events with a real map; fake Singpass screen). One GitHub issue per person holds the detailed checklist.

| Person | Workstream | Summary |
|--------|-----------|---------|
| ADK | F. Fake Singpass login | Singpass-style mock login screen on mobile |
| Bryan | G. Real events and real map | Real Singapore events in the seed, OpenStreetMap map on Discover and detail |
| Rian | C. Backend tests and security, then D. Product gaps | Task 1.8 test matrix, hardening, reporter reply, cancel and volunteers |
| Kira | E. Polish and cleanup | Icons, error strings, duplicated hooks, seed unions, `npm audit`, missing handoffs |
| YY | A + B. Device and web testing, second real event | Click-through of both PDF flows, NFR checks, find a second real event |

## Order

1. Day 1: ADK starts F, Bryan starts G, Kira starts E, YY starts A and B.
2. Day 2: Rian starts C once Bryan's seed change is merged (both touch `firebase/seed/` and `packages/shared`). YY retests after Kira merges the web hook change.
3. Day 3: Rian does D. Everyone runs both demo flows together.

## Rules

- No two people edit the same file at the same time. Kira and YY do not edit `functions/` or `packages/shared`.
- YY reports bugs to the owning person.
- When done: write `docs/handoffs/<task-id>.md` (from `TEMPLATE.md`), update `progress.md` and the relevant checklists.
- Never commit or push to `master` without agreement; work on a branch per person.
