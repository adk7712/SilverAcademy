// UC #0-1 generation token for login attempts: leaving the screen invalidates in-flight attempts so they never sign in.
export interface LoginGeneration {
  /** Starts a new attempt (older ones become stale) and returns its ticket. */
  begin: () => number;
  /** Makes every in-flight attempt stale (leave / reset / unmount). */
  invalidate: () => void;
  /** True only for the latest, not-invalidated attempt. */
  isCurrent: (ticket: number) => boolean;
}

export function createLoginGeneration(): LoginGeneration {
  let current = 0;
  return {
    begin: () => ++current,
    invalidate: () => {
      current += 1;
    },
    isCurrent: (ticket) => ticket === current,
  };
}
