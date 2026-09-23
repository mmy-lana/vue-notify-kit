/**
 * Local-storage persistence & hydration pipeline.
 *
 * Responsibilities (architecture plan §3.4):
 *  - typed, SSR-safe wrappers around `window.localStorage` (JSON + try/catch);
 *  - a 300 ms debounced write pipeline so toast bursts never thrash storage;
 *  - cross-tab synchronisation through the `storage` event, with an
 *    `isSyncingFromStorage` guard that prevents echo loops;
 *  - FIFO pruning of history records at {@link HISTORY_LIMIT};
 *  - automatic save/restore of the playground configuration and color theme.
 *
 * The reactive state is a module-level singleton: every consumer shares one
 * instance, one set of listeners, and one debounce queue. `useNotifyStorage()`
 * is reference-counted, so the pipeline only tears down after the last consumer
 * calls `dispose()`.
 */

import { effectScope, ref, watch, type EffectScope, type Ref } from 'vue';

import type {
  ColorTheme,
  NotificationHistoryRecord,
  PlaygroundConfiguration,
  StorageSchema,
} from '@/types/notify';
import {
  HISTORY_LIMIT,
  STORAGE_DEBOUNCE_MS,
  STORAGE_KEYS,
  createDefaultPlaygroundConfig,
  isColorTheme,
  isNotificationPosition,
  isNotificationType,
  isStackingMode,
  isTriggerSource,
} from '@/utils/constants';
import {
  normalizeBoolean,
  normalizeOptionalString,
  normalizeText,
  sanitizeObjectRecord,
  toFiniteNumber,
} from '@/utils/coerce';
import { clampDuration } from '@/utils/factory';

/** Keys owned by the persistence pipeline. */
type StorageKey = keyof StorageSchema;

/** Public surface returned by {@link useNotifyStorage}. */
export interface NotifyStorageApi {
  /** Chronological (newest first) dismissed-notification log. */
  readonly history: Ref<NotificationHistoryRecord[]>;
  /** Persisted playground configuration, hydrated on activation. */
  readonly playgroundConfig: Ref<PlaygroundConfiguration>;
  /** Persisted color-scheme preference (`system` when unset or invalid). */
  readonly colorTheme: Ref<ColorTheme>;
  /** Human-readable persistence failure, or `null` when healthy. */
  readonly persistenceError: Ref<string | null>;
  /** Maximum number of history records retained (FIFO pruning). */
  readonly historyLimit: number;
  /** True when `localStorage` is present, writable, and not in private mode. */
  isPersistent(): boolean;
  /** Prepends a history record, de-duplicating by id and pruning to the cap. */
  addHistoryRecord(record: NotificationHistoryRecord): void;
  /** Removes a single history record by id. */
  removeHistoryRecord(id: string): void;
  /** Empties the history log and persists the empty state immediately. */
  clearHistory(): void;
  /** Pretty-printed JSON snapshot of the history log, with secrets masked. */
  exportHistory(): string;
  /** Merges a partial playground configuration and validates the result. */
  updatePlaygroundConfig(patch: Partial<PlaygroundConfiguration>): void;
  /** Restores factory-default playground values and persists them at once. */
  resetPlaygroundConfig(): void;
  /** Persists the color-scheme preference at once. */
  setColorTheme(theme: ColorTheme): void;
  /** Flushes pending writes, then re-reads every slice from storage. */
  reloadFromStorage(): void;
  /** Writes every queued (debounced) mutation immediately. */
  flush(): void;
  /** Releases this consumer; the final release tears the pipeline down. */
  dispose(): void;
}

/* -------------------------------------------------------------------------- */
/* Singleton reactive state                                                    */
/* -------------------------------------------------------------------------- */

const history = ref<NotificationHistoryRecord[]>([]);
const playgroundConfig = ref<PlaygroundConfiguration>(createDefaultPlaygroundConfig());
const colorTheme = ref<ColorTheme>('system');
const persistenceError = ref<string | null>(null);

/* -------------------------------------------------------------------------- */
/* Pipeline internals                                                          */
/* -------------------------------------------------------------------------- */

interface PendingWrite {
  value: unknown;
  timer: ReturnType<typeof setTimeout>;
}

let storageHandle: Storage | null | undefined;
let storageWritable: boolean | null = null;
let scope: EffectScope | null = null;
let consumers = 0;
let isSyncingFromStorage = false;

const pendingWrites = new Map<StorageKey, PendingWrite>();
const persistedPayloads = new Map<StorageKey, string>();

const STORAGE_KEY_VALUES: readonly string[] = [
  STORAGE_KEYS.history,
  STORAGE_KEYS.playgroundConfig,
  STORAGE_KEYS.colorTheme,
];

function isStorageKey(value: string): value is StorageKey {
  return STORAGE_KEY_VALUES.includes(value);
}

function describeStorageFailure(error: unknown): string {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return 'Local storage quota exceeded — history is kept in memory only.';
    }

    return `Local storage unavailable (${error.name}) — history is kept in memory only.`;
  }

  if (error instanceof Error) {
    return `Local storage unavailable: ${error.message}`;
  }

  return 'Local storage unavailable — history is kept in memory only.';
}

/** Resolves `window.localStorage` once, tolerating privacy-mode access errors. */
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (storageHandle !== undefined) {
    return storageHandle;
  }

  try {
    storageHandle = window.localStorage;
  } catch (error) {
    persistenceError.value = describeStorageFailure(error);
    storageHandle = null;
  }

  return storageHandle;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function serialize(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? null;
  } catch {
    return null;
  }
}

function readRaw(storage: Storage, key: StorageKey): string | null {
  try {
    return storage.getItem(key);
  } catch (error) {
    persistenceError.value = describeStorageFailure(error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Payload sanitizers (localStorage is untrusted input)                        */
/* -------------------------------------------------------------------------- */

function sanitizeHistoryRecord(raw: unknown): NotificationHistoryRecord | null {
  const safe = sanitizeObjectRecord(raw);

  if (safe === null) {
    return null;
  }

  const id = normalizeText(safe.id);
  const title = normalizeText(safe.title);
  const timestamp = toFiniteNumber(safe.timestamp);
  const dismissedAt = toFiniteNumber(safe.dismissedAt);

  if (id === undefined || title === undefined || timestamp === null || dismissedAt === null) {
    return null;
  }

  if (!isNotificationType(safe.type)) {
    return null;
  }

  const record: NotificationHistoryRecord = {
    id,
    type: safe.type,
    title,
    timestamp,
    dismissedAt,
    triggerSource: isTriggerSource(safe.triggerSource) ? safe.triggerSource : 'api',
  };

  const description = normalizeText(safe.description);
  if (description !== undefined) {
    record.description = description;
  }

  return record;
}

function sanitizeHistory(raw: unknown): NotificationHistoryRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const records: NotificationHistoryRecord[] = [];
  const seen = new Set<string>();

  for (const candidate of raw) {
    const record = sanitizeHistoryRecord(candidate);

    if (record === null || seen.has(record.id)) {
      continue;
    }

    seen.add(record.id);
    records.push(record);

    if (records.length >= HISTORY_LIMIT) {
      break;
    }
  }

  return records;
}

function sanitizePlaygroundConfig(raw: unknown): PlaygroundConfiguration {
  const defaults = createDefaultPlaygroundConfig();
  const safe = sanitizeObjectRecord(raw);

  if (safe === null) {
    return defaults;
  }

  return {
    type: isNotificationType(safe.type) ? safe.type : defaults.type,
    title: normalizeText(safe.title) ?? defaults.title,
    description: normalizeOptionalString(safe.description, defaults.description),
    position: isNotificationPosition(safe.position) ? safe.position : defaults.position,
    duration: clampDuration(safe.duration, defaults.duration),
    showProgress: normalizeBoolean(safe.showProgress, defaults.showProgress),
    dismissible: normalizeBoolean(safe.dismissible, defaults.dismissible),
    pauseOnHover: normalizeBoolean(safe.pauseOnHover, defaults.pauseOnHover),
    sound: normalizeBoolean(safe.sound, defaults.sound),
    stackingMode: isStackingMode(safe.stackingMode) ? safe.stackingMode : defaults.stackingMode,
    hasPrimaryAction: normalizeBoolean(safe.hasPrimaryAction, defaults.hasPrimaryAction),
    hasSecondaryAction: normalizeBoolean(safe.hasSecondaryAction, defaults.hasSecondaryAction),
    primaryActionLabel: normalizeText(safe.primaryActionLabel) ?? defaults.primaryActionLabel,
    secondaryActionLabel: normalizeText(safe.secondaryActionLabel) ?? defaults.secondaryActionLabel,
  };
}

function sanitizeColorTheme(raw: unknown): ColorTheme {
  return isColorTheme(raw) ? raw : 'system';
}

/* -------------------------------------------------------------------------- */
/* Export-time redaction                                                       */
/* -------------------------------------------------------------------------- */

/** Marker substituted for every redacted value. */
const REDACTION_MASK = '****';

/**
 * Patterns redacted from notification text on export.
 *
 * Order matters: a JWT is masked before the broader bearer rule can stop at its
 * first dot, and credential `key=value` pairs are matched before the
 * card-number rule can consume the digits inside a value.
 *
 * Bias is deliberately towards false positives. Over-masking an export costs a
 * little readability; under-masking ships a live credential or a card number to
 * the user's disk. The persisted history is left untouched — only the exported
 * snapshot is redacted, so the in-app log keeps full fidelity.
 */
const REDACTION_RULES: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // JWT: header.payload.signature.
  { pattern: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g, replacement: REDACTION_MASK },
  // Authorization headers and bare bearer/basic credentials.
  { pattern: /\b(?:bearer|basic)\s+[A-Za-z0-9\-._~+/]{6,}=*/gi, replacement: REDACTION_MASK },
  // Credential pairs: password=..., api_key: ..., access_token=...
  // The key name and separator are captured separately so the replacement can
  // keep them: `api_key=****` stays auditable, whereas dropping the key would
  // leave an anonymous `=****` and hide which field was redacted.
  {
    pattern:
      /\b(password|passwd|pwd|passphrase|secret|client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|token|otp|pin)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
    replacement: `$1$2${REDACTION_MASK}`,
  },
  // Payment-card-like digit runs: 13-19 digits, tolerating spaces and dashes.
  { pattern: /\b(?:\d[ -]?){12,18}\d\b/g, replacement: REDACTION_MASK },
];

/**
 * Redacts credential-shaped substrings from one piece of free text.
 *
 * Titles are redacted alongside descriptions: a token pasted into a title is the
 * same leak, and exports are the one artefact that leaves the browser.
 */
function redactSensitiveText(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) {
    return value;
  }

  let redacted = value;

  for (const rule of REDACTION_RULES) {
    redacted = redacted.replace(rule.pattern, rule.replacement);
  }

  return redacted;
}

/** Returns a redacted copy of a history record, leaving the original untouched. */
function redactHistoryRecord(record: NotificationHistoryRecord): NotificationHistoryRecord {
  const redacted: NotificationHistoryRecord = { ...record, title: redactSensitiveText(record.title) ?? '' };
  const description = redactSensitiveText(record.description);

  if (description === undefined) {
    delete redacted.description;
  } else {
    redacted.description = description;
  }

  return redacted;
}

/* -------------------------------------------------------------------------- */
/* Debounced write pipeline                                                    */
/* -------------------------------------------------------------------------- */

function persist(key: StorageKey, value: unknown): void {
  const storage = getLocalStorage();

  if (storage === null) {
    return;
  }

  const payload = serialize(value);

  if (payload === null || persistedPayloads.get(key) === payload) {
    return;
  }

  try {
    storage.setItem(key, payload);
    persistedPayloads.set(key, payload);
    persistenceError.value = null;
  } catch (error) {
    persistenceError.value = describeStorageFailure(error);
  }
}

function schedulePersist(key: StorageKey, value: unknown, immediate = false): void {
  if (isSyncingFromStorage || typeof window === 'undefined') {
    return;
  }

  const pending = pendingWrites.get(key);

  if (pending !== undefined) {
    clearTimeout(pending.timer);
    pendingWrites.delete(key);
  }

  if (immediate) {
    persist(key, value);
    return;
  }

  const timer = setTimeout(() => {
    pendingWrites.delete(key);
    persist(key, value);
  }, STORAGE_DEBOUNCE_MS);

  pendingWrites.set(key, { value, timer });
}

/** Writes every queued mutation straight away (tab close, manual sync). */
function flushPendingWrites(): void {
  if (pendingWrites.size === 0) {
    return;
  }

  const queued = [...pendingWrites.entries()];
  pendingWrites.clear();

  for (const [key, pending] of queued) {
    clearTimeout(pending.timer);
    persist(key, pending.value);
  }
}

/* -------------------------------------------------------------------------- */
/* Hydration & cross-tab synchronisation                                       */
/* -------------------------------------------------------------------------- */

function resetSlice(key: StorageKey): void {
  switch (key) {
    case STORAGE_KEYS.history:
      history.value = [];
      break;
    case STORAGE_KEYS.playgroundConfig:
      playgroundConfig.value = createDefaultPlaygroundConfig();
      break;
    case STORAGE_KEYS.colorTheme:
      colorTheme.value = 'system';
      break;
  }
}

/**
 * Re-writes a slice whose stored payload no longer matches its sanitized form,
 * so corrupted or legacy data self-heals on the next visit.
 */
function healSlice(key: StorageKey, raw: string | null, value: unknown): void {
  if (raw === null) {
    // Nothing stored yet: defer the first write until the user mutates state.
    return;
  }

  const normalized = serialize(value);

  if (normalized === null || normalized === raw) {
    persistedPayloads.set(key, raw);
    return;
  }

  persistedPayloads.delete(key);
  schedulePersist(key, value, true);
}

function hydrateFromStorage(): void {
  const storage = getLocalStorage();

  if (storage === null) {
    return;
  }

  isSyncingFromStorage = true;

  const rawHistory = readRaw(storage, STORAGE_KEYS.history);
  const rawConfig = readRaw(storage, STORAGE_KEYS.playgroundConfig);
  const rawTheme = readRaw(storage, STORAGE_KEYS.colorTheme);

  try {
    if (rawHistory !== null) {
      history.value = sanitizeHistory(parseJson(rawHistory));
    }

    if (rawConfig !== null) {
      playgroundConfig.value = sanitizePlaygroundConfig(parseJson(rawConfig));
    }

    if (rawTheme !== null) {
      colorTheme.value = sanitizeColorTheme(parseJson(rawTheme));
    }
  } finally {
    isSyncingFromStorage = false;
  }

  healSlice(STORAGE_KEYS.history, rawHistory, history.value);
  healSlice(STORAGE_KEYS.playgroundConfig, rawConfig, playgroundConfig.value);
  healSlice(STORAGE_KEYS.colorTheme, rawTheme, colorTheme.value);
}

function applyRemoteValue(key: StorageKey, rawValue: string | null): void {
  isSyncingFromStorage = true;

  try {
    if (rawValue === null) {
      persistedPayloads.delete(key);
      resetSlice(key);
      return;
    }

    // Record the incoming payload first: the guard above plus this cache
    // prevents the debounced writer from echoing the change back.
    persistedPayloads.set(key, rawValue);
    const parsed = parseJson(rawValue);

    switch (key) {
      case STORAGE_KEYS.history:
        history.value = sanitizeHistory(parsed);
        break;
      case STORAGE_KEYS.playgroundConfig:
        playgroundConfig.value = sanitizePlaygroundConfig(parsed);
        break;
      case STORAGE_KEYS.colorTheme:
        colorTheme.value = sanitizeColorTheme(parsed);
        break;
    }
  } finally {
    isSyncingFromStorage = false;
  }
}

function applyRemoteReset(): void {
  isSyncingFromStorage = true;

  try {
    persistedPayloads.clear();
    resetSlice(STORAGE_KEYS.history);
    resetSlice(STORAGE_KEYS.playgroundConfig);
    resetSlice(STORAGE_KEYS.colorTheme);
  } finally {
    isSyncingFromStorage = false;
  }
}

function handleStorageEvent(event: StorageEvent): void {
  const storage = getLocalStorage();

  if (storage === null) {
    return;
  }

  if (event.storageArea !== null && event.storageArea !== storage) {
    return;
  }

  if (event.key === null) {
    applyRemoteReset();
    return;
  }

  if (isStorageKey(event.key)) {
    applyRemoteValue(event.key, event.newValue);
  }
}

function handleVisibilityChange(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    flushPendingWrites();
  }
}

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                   */
/* -------------------------------------------------------------------------- */

function activate(): void {
  const localScope = effectScope(true);

  localScope.run(() => {
    // `flush: 'sync'` keeps the `isSyncingFromStorage` guard airtight: incoming
    // storage events mutate refs synchronously, so skipped writes cannot leak
    // out on a later microtask.
    watch(history, (value) => schedulePersist(STORAGE_KEYS.history, value), {
      deep: true,
      flush: 'sync',
    });
    watch(
      playgroundConfig,
      (value) => schedulePersist(STORAGE_KEYS.playgroundConfig, value),
      { deep: true, flush: 'sync' },
    );
    watch(colorTheme, (value) => schedulePersist(STORAGE_KEYS.colorTheme, value), {
      flush: 'sync',
    });
  });

  scope = localScope;

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('pagehide', flushPendingWrites);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  hydrateFromStorage();
}

function teardown(): void {
  flushPendingWrites();

  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('pagehide', flushPendingWrites);
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  scope?.stop();
  scope = null;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

const api: NotifyStorageApi = {
  history,
  playgroundConfig,
  colorTheme,
  persistenceError,
  historyLimit: HISTORY_LIMIT,

  isPersistent(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    if (storageWritable !== null) {
      return storageWritable;
    }

    const storage = getLocalStorage();

    if (storage === null) {
      storageWritable = false;
      return storageWritable;
    }

    const probeKey = '__vue_notify_kit_probe__';

    try {
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      storageWritable = true;
    } catch (error) {
      persistenceError.value = describeStorageFailure(error);
      storageWritable = false;
    }

    return storageWritable;
  },

  addHistoryRecord(record: NotificationHistoryRecord): void {
    const sanitized = sanitizeHistoryRecord(record);

    if (sanitized === null) {
      return;
    }

    const next = history.value.filter((entry) => entry.id !== sanitized.id);
    next.unshift(sanitized);
    history.value = next.slice(0, HISTORY_LIMIT);
  },

  removeHistoryRecord(id: string): void {
    const next = history.value.filter((entry) => entry.id !== id);

    if (next.length !== history.value.length) {
      history.value = next;
    }
  },

  clearHistory(): void {
    history.value = [];
    schedulePersist(STORAGE_KEYS.history, history.value, true);
  },

  /**
   * Pretty-printed JSON snapshot of the history log with credential-shaped
   * values (bearer tokens, JWTs, passwords, card numbers) masked.
   *
   * This is the only history surface that leaves the browser, so redaction
   * happens here rather than at write time: the in-app log keeps full fidelity
   * while the downloaded artefact cannot leak a live secret.
   */
  exportHistory(): string {
    try {
      return JSON.stringify(history.value.map(redactHistoryRecord), null, 2);
    } catch {
      return '[]';
    }
  },

  updatePlaygroundConfig(patch: Partial<PlaygroundConfiguration>): void {
    playgroundConfig.value = sanitizePlaygroundConfig({ ...playgroundConfig.value, ...patch });
  },

  resetPlaygroundConfig(): void {
    playgroundConfig.value = createDefaultPlaygroundConfig();
    schedulePersist(STORAGE_KEYS.playgroundConfig, playgroundConfig.value, true);
  },

  setColorTheme(theme: ColorTheme): void {
    colorTheme.value = sanitizeColorTheme(theme);
    schedulePersist(STORAGE_KEYS.colorTheme, colorTheme.value, true);
  },

  reloadFromStorage(): void {
    flushPendingWrites();
    hydrateFromStorage();
  },

  flush(): void {
    flushPendingWrites();
  },

  dispose(): void {
    if (consumers === 0) {
      return;
    }

    consumers -= 1;

    if (consumers === 0) {
      teardown();
    }
  },
};

/**
 * Accesses the shared persistence pipeline.
 *
 * Safe to call from component setup or from plain modules; the singleton is
 * activated on first use and torn down once every consumer has disposed.
 */
export function useNotifyStorage(): NotifyStorageApi {
  consumers += 1;

  if (scope === null) {
    activate();
  }

  return api;
}
