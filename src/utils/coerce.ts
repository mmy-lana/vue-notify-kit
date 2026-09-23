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

/** Own keys that must never be carried out of untrusted data. */
const UNSAFE_RECORD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Copies an untrusted object into a fresh record with dangerous own keys
 * stripped.
 *
 * `JSON.parse` creates `__proto__` as an ordinary *own* data property (it never
 * invokes the setter), so a poisoned `localStorage` payload can smuggle one
 * through. Reading named fields from such an object is harmless, but the object
 * is unsafe to pass on: `Object.assign(target, record)` and any later `[[Set]]`
 * both invoke the `__proto__` accessor on the receiving object and can swap its
 * prototype. Dropping the key here means no sanitized record can carry the
 * hazard downstream.
 *
 * The returned object is a plain `Object.prototype`-rooted record: the source
 * prototype is never copied.
 */
export function sanitizeObjectRecord(candidate: unknown): Record<string, unknown> | null {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return null;
  }

  const safeRecord: Record<string, unknown> = {};
  const entries = Object.entries(candidate as Record<string, unknown>);

  for (const [key, value] of entries) {
    if (UNSAFE_RECORD_KEYS.has(key)) {
      continue;
    }

    safeRecord[key] = value;
  }

  return safeRecord;
}
