// UC #2-5 reference number `SA-YYMMDD-XXXXX` (ADR-020): Crockford base32 suffix, Singapore calendar date. Pure.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const REF_SUFFIX_LENGTH = 5;
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

const two = (n: number): string => String(n).padStart(2, '0');

/** `randomBytes` must hold at least REF_SUFFIX_LENGTH bytes (each maps to one base32 char via `& 31`). */
export function buildReferenceNo(now: Date, randomBytes: ArrayLike<number>): string {
  const sg = new Date(now.getTime() + SGT_OFFSET_MS);
  const date = `${two(sg.getUTCFullYear() % 100)}${two(sg.getUTCMonth() + 1)}${two(sg.getUTCDate())}`;
  let suffix = '';
  for (let i = 0; i < REF_SUFFIX_LENGTH; i++) {
    suffix += CROCKFORD[(randomBytes[i] ?? 0) & 31];
  }
  return `SA-${date}-${suffix}`;
}
