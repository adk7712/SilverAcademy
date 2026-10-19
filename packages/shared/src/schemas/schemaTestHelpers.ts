// Test helpers for schema tests (not exported from the barrel).
type Parser = { safeParse: (x: unknown) => { success: boolean } };
export const ok = (s: Parser, x: unknown) => expect(s.safeParse(x).success).toBe(true);
export const bad = (s: Parser, x: unknown) => expect(s.safeParse(x).success).toBe(false);
