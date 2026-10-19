// Removes undefined properties (deeply). The Firebase callable encoder turns undefined into null,
// which fails zod `.optional()` fields on the server, so every callable input goes through this.
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as T;
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return Object.fromEntries(entries.map(([k, v]) => [k, stripUndefined(v)])) as T;
  }
  return value;
}
