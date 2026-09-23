/**
 * Collision-resistant identifier generation.
 *
 * Prefers the platform CSPRNG (`crypto.randomUUID`, then
 * `crypto.getRandomValues`) and degrades to `Math.random` only on runtimes where
 * neither exists. Never throws.
 */

/** Formats 16 random bytes as an RFC 4122 version 4 UUID. */
function formatUuidV4(bytes: Uint8Array): string {
  // Set version (4) and variant (10xx) bits per RFC 4122 §4.4.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let hex = '';
  for (let index = 0; index < bytes.length; index += 1) {
    hex += bytes[index].toString(16).padStart(2, '0');
  }

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);

  try {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
      return bytes;
    }
  } catch {
    // Fall through to the non-cryptographic source below.
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

/**
 * Creates a unique identifier for notifications, history records, and action
 * buttons. Uses `crypto.randomUUID` when available for maximum entropy.
 */
export function createId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Some non-secure contexts expose `randomUUID` but throw when called.
  }

  return formatUuidV4(randomBytes(16));
}
