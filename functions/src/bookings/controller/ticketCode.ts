// UC #2-2 #2-3 ticket code generation (architecture.md 4.1, 4.2): 8 Crockford base32 chars from random bytes.
import { CROCKFORD_ALPHABET, TICKET_CODE_LENGTH } from '@silveracademy/shared';

/** Supplies `n` random bytes; the repo passes `crypto.randomBytes`. */
export type RandomBytes = (n: number) => Uint8Array;

/** 256 is a multiple of the 32-char alphabet, so `byte % 32` is unbiased. */
export function generateTicketCode(random: RandomBytes): string {
  const bytes = random(TICKET_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < TICKET_CODE_LENGTH; i += 1) {
    code += CROCKFORD_ALPHABET[(bytes[i] ?? 0) % CROCKFORD_ALPHABET.length];
  }
  return code;
}
