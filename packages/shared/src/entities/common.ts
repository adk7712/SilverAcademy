// Entity primitives shared by all collections (architecture.md 2). Cross-cutting.
import type { FONT_SCALES } from '../constants';

/** Fits both client and admin SDK Timestamps. Callable I/O uses ISO strings instead. */
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

/** Fields every stored doc carries unless noted. */
export interface Timestamps {
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

/** Docs that admins edit carry a version for stale-edit detection (#5-1 Ex1). */
export interface Versioned {
  version: number;
}

export type FontScale = (typeof FONT_SCALES)[number];
