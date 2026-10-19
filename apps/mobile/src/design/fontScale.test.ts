// NFR 2.1 tests for the persisted text-size helpers.
import { DEFAULT_FONT_SCALE, hydratedFontScale, normaliseFontScale, scaleSize } from './fontScale';

describe('normaliseFontScale', () => {
  it('accepts the supported scales', () => {
    expect(normaliseFontScale(1.25)).toBe(1.25);
    expect(normaliseFontScale(1.5)).toBe(1.5);
  });
  it('falls back to default for anything else', () => {
    expect(normaliseFontScale(2)).toBe(DEFAULT_FONT_SCALE);
    expect(normaliseFontScale('1.5')).toBe(DEFAULT_FONT_SCALE);
    expect(normaliseFontScale(null)).toBe(DEFAULT_FONT_SCALE);
  });
});

describe('scaleSize', () => {
  it('rounds scaled sizes', () => {
    expect(scaleSize(18, 1.25)).toBe(23);
    expect(scaleSize(18, 1.5)).toBe(27);
    expect(scaleSize(18, 1)).toBe(18);
  });
});

describe('hydratedFontScale', () => {
  it('uses the stored scale when the user has not changed it', () => {
    expect(hydratedFontScale(1, 1.5, false)).toBe(1.5);
  });
  it('keeps the session choice over a late-arriving stored value', () => {
    expect(hydratedFontScale(1.25, 1.5, true)).toBe(1.25);
  });
});
