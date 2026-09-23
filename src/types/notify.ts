/**
 * vue-notify-kit — pure domain type definitions.
 *
 * ARCHITECTURAL RULE: this module has **zero imports**. It must never depend on
 * components, composables, runtime helpers, or framework re-exports so that it
 * stays consumable from any layer (store, composables, UI, docs, tests).
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'loading'
  | 'default';

export type NotificationPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type StackingMode = 'expanded' | 'stacked' | 'condensed';

export interface NotificationAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  ariaLabel?: string;
  run: (notificationId: string) => void | Promise<void>;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration: number; // In milliseconds; 0 indicates persistent (no auto-dismiss)
  position: NotificationPosition;
  createdAt: number;
  dismissible: boolean;
  showProgress: boolean;
  pauseOnHover: boolean;
  pauseOnFocusLoss: boolean;
  sound: boolean;
  customClass?: string;
  actions: NotificationAction[];
  remainingTime: number;
  isPaused: boolean;
  timerStartedAt: number;
  triggerSource: 'playground' | 'api' | 'user-action';
  isDismissing: boolean;
}

export type CreateNotificationInput = Partial<
  Omit<
    NotificationItem,
    'id' | 'createdAt' | 'remainingTime' | 'isPaused' | 'timerStartedAt' | 'isDismissing'
  >
> & {
  title: string;
};

export type NotificationFactory = (input: CreateNotificationInput) => NotificationItem;

export interface PromiseNotificationMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
  description?: {
    loading?: string;
    success?: string | ((data: T) => string);
    error?: string | ((err: unknown) => string);
  };
}

export interface NotificationHistoryRecord {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  timestamp: number;
  dismissedAt: number;
  triggerSource: 'playground' | 'api' | 'user-action';
}

export interface PlaygroundConfiguration {
  type: NotificationType;
  title: string;
  description: string;
  position: NotificationPosition;
  duration: number;
  showProgress: boolean;
  dismissible: boolean;
  pauseOnHover: boolean;
  sound: boolean;
  stackingMode: StackingMode;
  hasPrimaryAction: boolean;
  hasSecondaryAction: boolean;
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

export interface DocNavigationSection {
  id: string;
  title: string;
  items: Array<{
    id: string;
    title: string;
    path: string;
    badge?: string;
  }>;
}

export interface StorageSchema {
  vue_notify_history: NotificationHistoryRecord[];
  vue_notify_playground_config: PlaygroundConfiguration;
  vue_notify_color_theme: 'system' | 'light' | 'dark';
}

/* -------------------------------------------------------------------------- */
/* Extended public contracts                                                   */
/* -------------------------------------------------------------------------- */

/** Resolved user color-scheme preference persisted by `useNotifyStorage`. */
export type ColorTheme = StorageSchema['vue_notify_color_theme'];

/** Origin of a notification, used for history attribution. */
export type NotificationTriggerSource = NotificationItem['triggerSource'];

/** Visual variant supported by notification action buttons. */
export type NotificationActionVariant = NotificationAction['variant'];

/** Keys handled by the debounced persistence pipeline. */
export type NotifyStorageKey = keyof StorageSchema;

/**
 * Promise bridge exposed as `notify.promise`. Returns the original promise so
 * callers can keep chaining after the toast lifecycle has been wired up.
 */
export interface NotifyPromiseBridge {
  <T>(executor: () => Promise<T>, messages: PromiseNotificationMessages<T>): Promise<T>;
}

/**
 * Public store contract implemented by `useNotify()` (architecture plan §3.1).
 * Declared here so documentation tables and consumers can reference one shared
 * signature without importing the store implementation.
 */
export interface NotifyStoreContract {
  notify: NotifyFn;
  createNotification: NotificationFactory;
  updateNotification(id: string, patch: Partial<NotificationItem>): void;
  dismiss(id: string): void;
  dismissAll(): void;
}

/** Callable notification pusher augmented with the promise bridge. */
export interface NotifyFn {
  (input: CreateNotificationInput): string;
  promise: NotifyPromiseBridge;
}
