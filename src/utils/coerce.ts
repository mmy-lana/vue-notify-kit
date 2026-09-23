/**
 * Defensive value coercion helpers shared by the factory and the persistence
 * layer. Every function is total: it accepts `unknown` and never throws, so it
 * is safe to run against hydrated `localStorage` payloads.
 */

/** Trims a candidate string; returns `undefined` for blanks or non-strings. */
export function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Keeps a candidate string as-is when it is a string (including empty), which
 * is required for user-clearable fields such as notification descriptions.
 */
export function normalizeOptionalString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

/** Copies a boolean when supplied, otherwise applies the documented default. */
export function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Returns a finite number when the candidate is numeric, otherwise `null`. */
export function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
