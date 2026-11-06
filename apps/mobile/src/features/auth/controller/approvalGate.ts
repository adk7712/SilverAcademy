// UC #0-1 fake "Approve in the Singpass app" delay: one cancellable timer, no double start, no sign-in after cancel.
export interface GateTimers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

const defaultTimers: GateTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface ApprovalGate {
  /** False (and does nothing) when already waiting, so a double tap cannot start two approvals. */
  start: () => boolean;
  /** Stops the wait; `onApproved` will not run. Safe to call at any time. */
  cancel: () => void;
  isActive: () => boolean;
}

export function createApprovalGate(
  delayMs: number,
  onApproved: () => void,
  timers: GateTimers = defaultTimers,
): ApprovalGate {
  let handle: unknown;
  let active = false;
  return {
    start: () => {
      if (active) return false;
      active = true;
      handle = timers.set(() => {
        active = false;
        onApproved();
      }, delayMs);
      return true;
    },
    cancel: () => {
      if (!active) return;
      active = false;
      timers.clear(handle);
    },
    isActive: () => active,
  };
}
