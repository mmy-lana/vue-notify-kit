/**
 * System-wide defaults, limits, storage keys, and enum membership guards.
 *
 * This module is framework-agnostic pure TS: no Vue runtime and no DOM access
 * at module evaluation time (safe under SSR).
 */

import type {
  ColorTheme,
  NotificationActionVariant,
  NotificationPosition,
  NotificationTriggerSource,
  NotificationType,
  PlaygroundConfiguration,
  StackingMode,
} from '@/types/notify';

/* -------------------------------------------------------------------------- */
/* Notification defaults                                                       */
/* -------------------------------------------------------------------------- */

/** Default auto-dismiss delay in milliseconds. */
export const DEFAULT_DURATION = 4000;

/** Persisted notifications never auto-dismiss. */
export const PERSISTENT_DURATION = 0;

/** Duration lower bound accepted by the factory / playground slider (ms). */
export const MIN_DURATION = 0;

/** Duration upper bound accepted by the factory / playground slider (ms). */
export const MAX_DURATION = 15_000;

/** Fine-tuning step used by `BaseSlider` for duration controls (ms). */
export const DURATION_STEP = 100;

/** Fallback type applied when a caller omits or misspells `type`. */
export const DEFAULT_TYPE: NotificationType = 'info';

/** Fallback position applied when a caller omits or misspells `position`. */
export const DEFAULT_POSITION: NotificationPosition = 'top-right';

/** Fallback stacking mode. */
export const DEFAULT_STACKING_MODE: StackingMode = 'expanded';

/** Neutral title used when a caller supplies a blank/whitespace-only title. */
export const DEFAULT_NOTIFICATION_TITLE = 'Notification';

export const DEFAULT_DISMISSIBLE = true;
export const DEFAULT_PAUSE_ON_HOVER = true;
export const DEFAULT_PAUSE_ON_FOCUS_LOSS = true;
export const DEFAULT_SHOW_PROGRESS = true;
export const DEFAULT_SOUND = false;

/** Every notification enters the store attributed to the programmatic API. */
export const DEFAULT_TRIGGER_SOURCE: NotificationTriggerSource = 'api';

/* -------------------------------------------------------------------------- */
/* Queue, timing, and gesture limits                                           */
/* -------------------------------------------------------------------------- */

/** Maximum simultaneously visible items per position anchor before eviction. */
export const MAX_STACK_PER_POSITION = 5;

/** Exit animation window before a dismissing item is spliced out (ms). */
export const DISMISS_EXIT_DURATION = 200;

/** Horizontal distance (px) required to commit a swipe-to-dismiss gesture. */
export const SWIPE_THRESHOLD_PX = 96;

/** Swipe velocity (px/ms) that commits dismissal regardless of distance. */
export const SWIPE_VELOCITY_THRESHOLD = 0.4;

/** Debounce window for the localStorage persistence pipeline (ms). */
export const STORAGE_DEBOUNCE_MS = 300;

/** FIFO cap applied to persisted notification history records. */
export const HISTORY_LIMIT = 50;

/* -------------------------------------------------------------------------- */
/* Responsive layout constants                                                 */
/* -------------------------------------------------------------------------- */

/** Below this width the toast viewport is normalized to a centered anchor. */
export const MOBILE_BREAKPOINT_PX = 768;

/** Tablet range upper bound (px) — used by the documentation shell. */
export const DESKTOP_BREAKPOINT_PX = 1024;

/* -------------------------------------------------------------------------- */
/* Persistence keys                                                            */
/* -------------------------------------------------------------------------- */

export const STORAGE_KEYS = {
  history: 'vue_notify_history',
  playgroundConfig: 'vue_notify_playground_config',
  colorTheme: 'vue_notify_color_theme',
} as const satisfies Record<string, string>;

/* -------------------------------------------------------------------------- */
/* Enum registries                                                             */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_TYPES = [
  'info',
  'success',
  'warning',
  'error',
  'loading',
  'default',
] as const satisfies readonly NotificationType[];

export const NOTIFICATION_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const satisfies readonly NotificationPosition[];

export const STACKING_MODES = [
  'expanded',
  'stacked',
  'condensed',
] as const satisfies readonly StackingMode[];

export const ACTION_VARIANTS = [
  'primary',
  'secondary',
  'danger',
  'ghost',
] as const satisfies readonly NotificationActionVariant[];

export const TRIGGER_SOURCES = [
  'playground',
  'api',
  'user-action',
] as const satisfies readonly NotificationTriggerSource[];

export const COLOR_THEMES = [
  'system',
  'light',
  'dark',
] as const satisfies readonly ColorTheme[];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  loading: 'Loading',
  default: 'Default',
};

export const NOTIFICATION_POSITION_LABELS: Record<NotificationPosition, string> = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
};

export const STACKING_MODE_LABELS: Record<StackingMode, string> = {
  expanded: 'Expanded',
  stacked: 'Stacked',
  condensed: 'Condensed',
};

/* -------------------------------------------------------------------------- */
/* Playground defaults                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Freshly built default playground state. Returns a new object on every call so
 * consumers can mutate their copy without leaking state across the store.
 */
export function createDefaultPlaygroundConfig(): PlaygroundConfiguration {
  return {
    type: DEFAULT_TYPE,
    title: 'Deployment finished',
    description: 'Build #1482 shipped to production in 42s.',
    position: DEFAULT_POSITION,
    duration: DEFAULT_DURATION,
    showProgress: DEFAULT_SHOW_PROGRESS,
    dismissible: DEFAULT_DISMISSIBLE,
    pauseOnHover: DEFAULT_PAUSE_ON_HOVER,
    sound: DEFAULT_SOUND,
    stackingMode: DEFAULT_STACKING_MODE,
    hasPrimaryAction: true,
    hasSecondaryAction: false,
    primaryActionLabel: 'View release',
    secondaryActionLabel: 'Dismiss',
  };
}

/* -------------------------------------------------------------------------- */
/* Enum membership guards                                                      */
/* -------------------------------------------------------------------------- */

function isMember<T extends string>(registry: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (registry as readonly string[]).includes(value);
}

export function isNotificationType(value: unknown): value is NotificationType {
  return isMember(NOTIFICATION_TYPES, value);
}

export function isNotificationPosition(value: unknown): value is NotificationPosition {
  return isMember(NOTIFICATION_POSITIONS, value);
}

export function isStackingMode(value: unknown): value is StackingMode {
  return isMember(STACKING_MODES, value);
}

export function isActionVariant(value: unknown): value is NotificationActionVariant {
  return isMember(ACTION_VARIANTS, value);
}

export function isTriggerSource(value: unknown): value is NotificationTriggerSource {
  return isMember(TRIGGER_SOURCES, value);
}

export function isColorTheme(value: unknown): value is ColorTheme {
  return isMember(COLOR_THEMES, value);
}

/** Narrows an unknown value to a non-null, non-array object record. */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
