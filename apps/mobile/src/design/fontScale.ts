// Pure helpers for the user-adjustable text size (NFR 2.1). No React so it is unit-testable.
import { FONT_SCALES } from '@silveracademy/shared';

export type FontScale = (typeof FONT_SCALES)[number];
export const DEFAULT_FONT_SCALE: FontScale = FONT_SCALES[0];

/** Accepts anything read from storage; returns a valid scale or the default. */
export function normaliseFontScale(value: unknown): FontScale {
  return FONT_SCALES.find((s) => s === value) ?? DEFAULT_FONT_SCALE;
}

export const scaleSize = (size: number, scale: FontScale): number => Math.round(size * scale);

/** Scale to apply once storage has loaded: never overrides a scale the user picked this session. */
export function hydratedFontScale(
  current: FontScale,
  stored: unknown,
  userChangedThisSession: boolean,
): FontScale {
  return userChangedThisSession ? current : normaliseFontScale(stored);
}
