// Injectable clock so decide* functions stay pure (docs/architecture.md section 1.1, 4).
export type Clock = () => Date;

/** Production clock. Handlers pass `ctx.now` into `decide*`; tests pass `fixedClock(...)`. */
export const now: Clock = () => new Date();

/** Deterministic clock for tests. */
export const fixedClock =
  (iso: string): Clock =>
  () =>
    new Date(iso);
