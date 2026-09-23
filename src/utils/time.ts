/**
 * SSR-safe clock helpers.
 *
 * Notification timers must never depend on wall-clock jumps (system sleep,
 * NTP corrections, manual clock changes), so countdown math uses the monotonic
 * `performance.now()` timeline whenever the runtime provides it.
 */

/** Monotonic millisecond timestamp; falls back to `Date.now()` without `performance`. */
export function monotonicNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

/** Wall-clock epoch timestamp in milliseconds, used for history attribution. */
export function wallClockNow(): number {
  return Date.now();
}
