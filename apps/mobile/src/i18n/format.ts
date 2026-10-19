// i18n helper: replaces {name} placeholders in a string template. Cross-cutting.
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => String(params[key] ?? ''));
}
